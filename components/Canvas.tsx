'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Comments, type Perm } from './Panels';
import EmojiPicker from './EmojiPicker';
import Icon, { type IconName } from './Icon';
import { getTemplate } from '@/lib/templates';
import { uploadImage } from '@/lib/uploadClient';

type U = { id: string; name: string; color: string };
type Props = { pageId: string; title: string; icon: string | null; template?: string; perm: Perm; user: U; collabUrl: string; canManage: boolean };
type Kind = 'rect' | 'ellipse' | 'sticky' | 'text' | 'line' | 'image';
// For 'line', w/h are the signed distance from the start point (x, y) to the end point. For 'image', text holds the image URL.
type Shape = { id: string; kind: Kind; x: number; y: number; w: number; h: number; fill: string; text: string; z: number };
type Tool = 'select' | Exclude<Kind, 'image'>;
type Cursor = { x: number; y: number };

const FILLS = ['#ffffff', '#fbf3db', '#e6f0e6', '#e7f0f7', '#f5e0e9', '#ebeae6'];
const LINE_COLORS = ['#37352f', '#2f6fa3', '#4a7c4a', '#b4453a', '#8a6d1d'];
const INK = '#37352f';
const TOOLS: { key: Tool; label: string; hot: string; icon: IconName }[] = [
  { key: 'select', label: 'Select', hot: 'V', icon: 'pointer' },
  { key: 'rect', label: 'Rectangle', hot: 'R', icon: 'square' },
  { key: 'ellipse', label: 'Ellipse', hot: 'O', icon: 'circle' },
  { key: 'sticky', label: 'Sticky note', hot: 'S', icon: 'sticky' },
  { key: 'text', label: 'Text', hot: 'T', icon: 'type' },
  { key: 'line', label: 'Arrow', hot: 'A', icon: 'arrow' },
];
const MIN = 24;

export default function Canvas(p: Props) {
  const [c, setC] = useState<{ doc: Y.Doc; provider: WebsocketProvider } | null>(null);
  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(p.collabUrl, p.pageId, doc);
    setC({ doc, provider });
    return () => {
      provider.destroy();
      doc.destroy();
      setC(null);
    };
  }, [p.collabUrl, p.pageId]);
  return c ? <Board {...p} {...c} /> : <div className="p-8 text-gray-600">Loading canvas…</div>;
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { mode: 'move'; id: string; ox: number; oy: number; sx: number; sy: number }
  | { mode: 'resize'; id: string; sx: number; sy: number; w: number; h: number }
  | { mode: 'lineStart'; id: string }
  | { mode: 'draw'; id: string; sx: number; sy: number };

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function Board({ pageId, title, icon: initialIcon, template, perm, user, doc, provider }: Props & { doc: Y.Doc; provider: WebsocketProvider }) {
  const router = useRouter();
  const editable = perm === 'EDIT';
  const shapesMap = useMemo(() => doc.getMap<Shape>('shapes'), [doc]);
  const undo = useMemo(() => new Y.UndoManager(shapesMap), [shapesMap]);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const spaceDown = useRef(false);
  const lastCursorSend = useRef(0);
  const tplApplied = useRef(false);

  const [shapes, setShapes] = useState<Shape[]>([]);
  const [peers, setPeers] = useState<U[]>([]);
  const [cursors, setCursors] = useState<{ user: U; pos: Cursor }[]>([]);
  const [status, setStatus] = useState('connecting');
  const [synced, setSynced] = useState(false);
  const [tool, setTool] = useState<Tool>('select');
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [name, setName] = useState(title);
  const [icon, setIcon] = useState(initialIcon);
  const [pick, setPick] = useState(false);
  const [panel, setPanel] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ---- shapes <-> Yjs ---- */
  useEffect(() => {
    const read = () => setShapes([...shapesMap.values()].sort((a, b) => a.z - b.z));
    shapesMap.observe(read);
    read();
    return () => shapesMap.unobserve(read);
  }, [shapesMap]);
  useEffect(() => () => undo.destroy(), [undo]);

  const put = useCallback((s: Shape) => { if (editable) doc.transact(() => shapesMap.set(s.id, s)); }, [doc, shapesMap, editable]);
  const patch = useCallback((id: string, d: Partial<Shape>) => {
    const s = shapesMap.get(id);
    if (s && editable) doc.transact(() => shapesMap.set(id, { ...s, ...d }));
  }, [doc, shapesMap, editable]);
  const remove = useCallback((id: string) => { if (editable) doc.transact(() => shapesMap.delete(id)); }, [doc, shapesMap, editable]);
  const topZ = () => shapes.reduce((m, s) => Math.max(m, s.z), 0) + 1;

  /* ---- fill a brand-new canvas from its template, once ---- */
  useEffect(() => {
    if (!template || tplApplied.current || !synced || !editable) return;
    tplApplied.current = true;
    const tpl = getTemplate(template);
    if (tpl?.shapes && shapesMap.size === 0) {
      doc.transact(() => {
        tpl.shapes!.forEach((s, i) => {
          const id = crypto.randomUUID();
          shapesMap.set(id, { id, kind: s.kind, x: s.x, y: s.y, w: s.w, h: s.h, fill: s.fill ?? (s.kind === 'line' ? INK : '#ffffff'), text: s.text ?? '', z: i + 1 });
        });
      });
      setView({ x: 30, y: 20, k: 0.8 });
    }
    window.history.replaceState(null, '', window.location.pathname);
  }, [template, synced, editable, doc, shapesMap]);

  /* ---- presence + connection status ---- */
  useEffect(() => {
    const aw = provider.awareness;
    aw.setLocalStateField('user', user);
    const onAw = () => {
      const m = new Map<string, U>();
      const cs: { user: U; pos: Cursor }[] = [];
      aw.getStates().forEach((s, cid) => {
        if (!s.user) return;
        m.set(s.user.id, s.user);
        if (cid !== aw.clientID && s.cursor) cs.push({ user: s.user, pos: s.cursor });
      });
      setPeers([...m.values()]);
      setCursors(cs);
    };
    const onStatus = (e: { status: string }) => setStatus(e.status);
    const onSync = (s: boolean) => setSynced(s);
    provider.on('status', onStatus);
    provider.on('sync', onSync);
    aw.on('change', onAw);
    onAw();
    return () => {
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      aw.off('change', onAw);
    };
  }, [provider, user]);

  /* ---- helpers ---- */
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k };
  };
  const hit = (x: number, y: number) =>
    [...shapes].reverse().find((s) => (s.kind === 'line' ? distToSegment(x, y, s.x, s.y, s.x + s.w, s.y + s.h) <= 8 / view.k : x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h));

  /* ---- pointer interaction ---- */
  const onDown = (e: React.PointerEvent) => {
    if (editing) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const w = toWorld(e);
    if (e.button === 1 || spaceDown.current) {
      drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
      return;
    }
    if (tool !== 'select') {
      if (!editable) return;
      const id = crypto.randomUUID();
      const isLine = tool === 'line';
      put({ id, kind: tool, x: w.x, y: w.y, w: isLine ? 0 : 1, h: isLine ? 0 : 1, fill: tool === 'sticky' ? '#fbf3db' : isLine ? INK : '#ffffff', text: '', z: topZ() });
      setSel(id);
      drag.current = { mode: 'draw', id, sx: w.x, sy: w.y };
      return;
    }
    const s = hit(w.x, w.y);
    setSel(s?.id ?? null);
    if (!s) { drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; return; }
    if (editable) drag.current = { mode: 'move', id: s.id, ox: s.x, oy: s.y, sx: w.x, sy: w.y };
  };

  const onMove = (e: React.PointerEvent) => {
    const w = toWorld(e);
    const now = Date.now();
    if (now - lastCursorSend.current > 50) {
      lastCursorSend.current = now;
      provider.awareness.setLocalStateField('cursor', { x: w.x, y: w.y });
    }
    const d = drag.current;
    if (!d) return;
    if (d.mode === 'pan') setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }));
    else if (d.mode === 'move') patch(d.id, { x: d.ox + w.x - d.sx, y: d.oy + w.y - d.sy });
    else if (d.mode === 'resize') {
      const s = shapesMap.get(d.id);
      if (s?.kind === 'line') patch(d.id, { w: w.x - s.x, h: w.y - s.y });
      else patch(d.id, { w: Math.max(MIN, d.w + w.x - d.sx), h: Math.max(MIN, d.h + w.y - d.sy) });
    } else if (d.mode === 'lineStart') {
      const s = shapesMap.get(d.id);
      if (s) patch(d.id, { x: w.x, y: w.y, w: s.x + s.w - w.x, h: s.y + s.h - w.y });
    } else if (d.mode === 'draw') {
      const s = shapesMap.get(d.id);
      if (s?.kind === 'line') patch(d.id, { w: w.x - d.sx, h: w.y - d.sy });
      else patch(d.id, { x: Math.min(d.sx, w.x), y: Math.min(d.sy, w.y), w: Math.max(1, Math.abs(w.x - d.sx)), h: Math.max(1, Math.abs(w.y - d.sy)) });
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.mode !== 'draw') return;
    const s = shapesMap.get(d.id);
    if (!s) return;
    if (s.kind === 'line') {
      if (Math.hypot(s.w, s.h) < 10) patch(d.id, { w: 140, h: 0 });
      setTool('select');
      return;
    }
    // A plain click creates a default-sized shape.
    if (s.w < MIN && s.h < MIN) patch(d.id, { w: s.kind === 'text' ? 160 : s.kind === 'sticky' ? 180 : 140, h: s.kind === 'text' ? 40 : s.kind === 'sticky' ? 180 : 100 });
    setTool('select');
    setEditing(d.id);
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (e.ctrlKey || e.metaKey) {
      const k = Math.min(4, Math.max(0.2, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      setView((v) => ({ k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k }));
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  /* ---- image from the user's computer ---- */
  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !editable) return;
    setUploading(true);
    try {
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const u = URL.createObjectURL(f);
        const im = new window.Image();
        im.onload = () => { URL.revokeObjectURL(u); res({ w: im.naturalWidth, h: im.naturalHeight }); };
        im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('That file is not a readable image')); };
        im.src = u;
      });
      const url = await uploadImage(pageId, f);
      const scale = Math.min(1, 360 / Math.max(dims.w, dims.h));
      const w = Math.max(MIN, Math.round(dims.w * scale)), h = Math.max(MIN, Math.round(dims.h * scale));
      const r = svgRef.current!.getBoundingClientRect();
      const c = toWorld({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
      const id = crypto.randomUUID();
      put({ id, kind: 'image', x: c.x - w / 2, y: c.y - h / 2, w, h, fill: '#ffffff', text: url, z: topZ() });
      setSel(id);
      setTool('select');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
  };

  /* ---- keyboard ---- */
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code === 'Space') { spaceDown.current = true; e.preventDefault(); return; }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (editable) (e.shiftKey ? undo.redo() : undo.undo()); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); if (editable) undo.redo(); return; }
      if (mod && e.key.toLowerCase() === 'd' && sel && editable) {
        e.preventDefault();
        duplicate();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); remove(sel); setSel(null); return; }
      if (e.key === 'Escape') { setSel(null); setTool('select'); return; }
      if (!mod && editable) {
        if (e.key.toLowerCase() === 'i') { fileRef.current?.click(); return; }
        const t = TOOLS.find((x) => x.hot.toLowerCase() === e.key.toLowerCase());
        if (t) setTool(t.key);
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });

  const duplicate = () => {
    const s = sel ? shapesMap.get(sel) : undefined;
    if (!s) return;
    const id = crypto.randomUUID();
    put({ ...s, id, x: s.x + 20, y: s.y + 20, z: topZ() });
    setSel(id);
  };

  const patchPage = async (body: Record<string, unknown>) => {
    const r = await fetch(`/api/pages/${pageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) router.refresh();
    return r.ok;
  };
  const rename = async () => {
    if (!editable || !name.trim() || name === title) return;
    await patchPage({ title: name });
  };
  const saveIcon = async (v: string | null) => {
    setPick(false);
    const prev = icon;
    setIcon(v);
    if (!(await patchPage({ icon: v ?? '' }))) setIcon(prev);
  };

  const live = status === 'connected';
  const selected = sel ? shapes.find((s) => s.id === sel) : undefined;
  const edit = editing ? shapes.find((s) => s.id === editing) : undefined;
  const cursorStyle = spaceDown.current ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
  const bar = 'absolute z-10 flex items-center gap-1 rounded-xl border border-[#e9e9e7] bg-white/95 p-1 shadow-md backdrop-blur';
  const tbtn = (on: boolean) => `flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${on ? 'bg-accent text-white' : 'text-[#5f5e5b] hover:bg-[#ebeae6]'} disabled:opacity-40`;

  return (
    <div className="px-4 pb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex min-w-0 flex-1 items-center gap-2">
          {(icon || editable) && (
            <button type="button" disabled={!editable} onClick={() => setPick(!pick)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl hover:bg-[#ebeae6]" aria-label="Page icon" title="Change icon">
              {icon || <Icon name="canvas" size={22} className="text-gray-500" />}
            </button>
          )}
          {pick && <EmojiPicker onPick={saveIcon} onRemove={icon ? () => saveIcon(null) : undefined} onClose={() => setPick(false)} />}
          <input className="w-full max-w-md border-0 bg-transparent px-0 text-2xl font-bold tracking-tight focus:outline-none" value={name} readOnly={!editable} onChange={(e) => setName(e.target.value)} onBlur={rename} aria-label="Canvas title" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {peers.map((q) => (
              <span key={q.id} title={q.name} style={{ background: q.color }} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white">{q.name.slice(0, 2).toUpperCase()}</span>
            ))}
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${live ? (synced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') : 'bg-red-100 text-red-800'}`}>{live ? (synced ? 'Live' : 'Syncing…') : 'Offline – retrying'}</span>
          <button type="button" aria-pressed={panel} onClick={() => setPanel(!panel)} className={`btn-secondary !py-1 ${panel ? '!bg-[#ebeae6]' : ''}`}><Icon name="comment" />Comments</button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-[#e9e9e7] bg-white shadow-sm" style={{ height: 'calc(100vh - 190px)', minHeight: 440 }}>
        {/* tool rail */}
        <div className={`${bar} left-3 top-1/2 -translate-y-1/2 flex-col`} role="toolbar" aria-label="Canvas tools" aria-orientation="vertical">
          {editable ? (
            <>
              {TOOLS.map((t) => (
                <button key={t.key} type="button" aria-label={t.label} aria-pressed={tool === t.key} title={`${t.label} (${t.hot})`} onClick={() => setTool(t.key)} className={tbtn(tool === t.key)}><Icon name={t.icon} size={18} /></button>
              ))}
              <button type="button" aria-label="Insert image" title="Image from your computer (I)" disabled={uploading} onClick={() => fileRef.current?.click()} className={tbtn(false)}><Icon name={uploading ? 'upload' : 'image'} size={18} /></button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={onPickImage} aria-label="Upload image from your computer" />
            </>
          ) : (
            <span className="max-w-[7rem] px-2 py-1 text-xs text-gray-600">View only</span>
          )}
        </div>

        {/* zoom + history */}
        <div className={`${bar} bottom-3 left-3`}>
          {editable && (
            <>
              <button type="button" aria-label="Undo" title="Undo (Ctrl+Z)" onClick={() => undo.undo()} className={tbtn(false)}><Icon name="undo" /></button>
              <button type="button" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" onClick={() => undo.redo()} className={tbtn(false)}><Icon name="redo" /></button>
              <span className="mx-0.5 h-5 w-px bg-[#e9e9e7]" />
            </>
          )}
          <button type="button" aria-label="Zoom out" onClick={() => setView((v) => ({ ...v, k: Math.max(0.2, v.k * 0.9) }))} className={tbtn(false)}><Icon name="minus" /></button>
          <button type="button" aria-label="Reset zoom" title="Reset view" onClick={() => setView({ x: 0, y: 0, k: 1 })} className="h-9 min-w-12 rounded-lg px-1 text-xs hover:bg-[#ebeae6]">{Math.round(view.k * 100)}%</button>
          <button type="button" aria-label="Zoom in" onClick={() => setView((v) => ({ ...v, k: Math.min(4, v.k * 1.1) }))} className={tbtn(false)}><Icon name="plus" /></button>
        </div>

        {/* selection properties */}
        {selected && editable && (
          <div className={`${bar} bottom-3 left-1/2 -translate-x-1/2 gap-2 px-2`}>
            {selected.kind !== 'image' && (selected.kind === 'line' ? LINE_COLORS : FILLS).map((f) => (
              <button key={f} type="button" aria-label={`Color ${f}`} onClick={() => patch(selected.id, { fill: f })} style={{ background: f }} className={`h-6 w-6 rounded-full border ${selected.fill === f ? 'ring-2 ring-accent ring-offset-1' : 'border-[#d3d2ce]'}`} />
            ))}
            {selected.kind !== 'image' && <span className="h-5 w-px bg-[#e9e9e7]" />}
            <button type="button" className="rounded-lg px-2 py-1 text-xs hover:bg-[#ebeae6]" onClick={() => patch(selected.id, { z: topZ() })}>Front</button>
            <button type="button" className="rounded-lg px-2 py-1 text-xs hover:bg-[#ebeae6]" onClick={() => patch(selected.id, { z: Math.min(...shapes.map((s) => s.z)) - 1 })}>Back</button>
            <button type="button" aria-label="Duplicate" title="Duplicate (Ctrl+D)" className={tbtn(false)} onClick={duplicate}><Icon name="copy" /></button>
            <button type="button" aria-label="Delete" title="Delete" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-50" onClick={() => { remove(selected.id); setSel(null); }}><Icon name="trash" /></button>
          </div>
        )}

        {/* comments panel */}
        {panel && (
          <aside className="absolute bottom-0 right-0 top-0 z-20 w-80 overflow-y-auto border-l border-[#e9e9e7] bg-white p-4 shadow-lg" aria-label="Comments">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">Comments</span>
              <button type="button" aria-label="Close comments" className="rounded p-1 hover:bg-[#ebeae6]" onClick={() => setPanel(false)}><Icon name="x" /></button>
            </div>
            <Comments pageId={pageId} perm={perm} userId={user.id} />
          </aside>
        )}

        <svg
          ref={svgRef}
          className="h-full w-full touch-none select-none"
          style={{ cursor: cursorStyle }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => provider.awareness.setLocalStateField('cursor', null)}
          onWheel={onWheel}
          onDoubleClick={(e) => {
            if (!editable || tool !== 'select') return;
            const w = toWorld(e);
            const s = hit(w.x, w.y);
            if (s && s.kind !== 'line' && s.kind !== 'image') { setSel(s.id); setEditing(s.id); }
          }}
        >
          <defs>
            <pattern id="grid" width={24 * view.k} height={24 * view.k} patternUnits="userSpaceOnUse" x={view.x} y={view.y}>
              <circle cx={1} cy={1} r={1} fill="#d9d8d3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {shapes.map((s) => {
              if (s.kind === 'line') {
                const x2 = s.x + s.w, y2 = s.y + s.h, a = Math.atan2(s.h, s.w), L = 14, sp = Math.PI / 7;
                const pts = `${x2},${y2} ${x2 - L * Math.cos(a - sp)},${y2 - L * Math.sin(a - sp)} ${x2 - L * Math.cos(a + sp)},${y2 - L * Math.sin(a + sp)}`;
                return (
                  <g key={s.id}>
                    <line x1={s.x} y1={s.y} x2={x2} y2={y2} stroke={s.fill} strokeWidth={2.5} strokeLinecap="round" />
                    <polygon points={pts} fill={s.fill} />
                  </g>
                );
              }
              if (s.kind === 'image') return <image key={s.id} href={s.text} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMid meet" />;
              return (
                <g key={s.id}>
                  {s.kind === 'ellipse' ? (
                    <ellipse cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} fill={s.fill} stroke={INK} strokeWidth={1.5} />
                  ) : s.kind === 'text' ? (
                    <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="transparent" />
                  ) : (
                    <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.kind === 'sticky' ? 4 : 8} fill={s.fill} stroke={s.kind === 'sticky' ? '#d9c98a' : INK} strokeWidth={s.kind === 'sticky' ? 1 : 1.5} style={s.kind === 'sticky' ? { filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.12))' } : undefined} />
                  )}
                  {editing !== s.id && s.text && (
                    <foreignObject x={s.x} y={s.y} width={s.w} height={s.h} pointerEvents="none">
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: s.kind === 'sticky' ? 'flex-start' : 'center', justifyContent: s.kind === 'sticky' || s.kind === 'text' ? 'flex-start' : 'center', padding: 8, fontSize: s.kind === 'text' ? 18 : 14, fontWeight: s.kind === 'text' ? 600 : 400, lineHeight: 1.35, color: INK, overflow: 'hidden', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textAlign: s.kind === 'sticky' || s.kind === 'text' ? 'left' : 'center', boxSizing: 'border-box' }}>
                        {s.text}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}

            {selected && (
              <g>
                {selected.kind === 'line' ? (
                  editable && (
                    <>
                      <circle cx={selected.x} cy={selected.y} r={6 / view.k} fill="#fff" stroke="#2f6fa3" strokeWidth={1.5 / view.k} style={{ cursor: 'move' }} onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { mode: 'lineStart', id: selected.id }; }} />
                      <circle cx={selected.x + selected.w} cy={selected.y + selected.h} r={6 / view.k} fill="#fff" stroke="#2f6fa3" strokeWidth={1.5 / view.k} style={{ cursor: 'move' }} onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); const w = toWorld(e); drag.current = { mode: 'resize', id: selected.id, sx: w.x, sy: w.y, w: selected.w, h: selected.h }; }} />
                    </>
                  )
                ) : (
                  <>
                    <rect x={selected.x} y={selected.y} width={selected.w} height={selected.h} fill="none" stroke="#2f6fa3" strokeWidth={1.5 / view.k} strokeDasharray={`${4 / view.k}`} pointerEvents="none" />
                    {editable && (
                      <rect
                        x={selected.x + selected.w - 5 / view.k}
                        y={selected.y + selected.h - 5 / view.k}
                        width={10 / view.k}
                        height={10 / view.k}
                        fill="#fff"
                        stroke="#2f6fa3"
                        strokeWidth={1.5 / view.k}
                        style={{ cursor: 'nwse-resize' }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          (e.target as Element).setPointerCapture?.(e.pointerId);
                          const w = toWorld(e);
                          drag.current = { mode: 'resize', id: selected.id, sx: w.x, sy: w.y, w: selected.w, h: selected.h };
                        }}
                      />
                    )}
                  </>
                )}
              </g>
            )}

            {edit && (
              <foreignObject x={edit.x} y={edit.y} width={edit.w} height={edit.h}>
                <textarea
                  autoFocus
                  defaultValue={edit.text}
                  onBlur={(e) => { patch(edit.id, { text: e.target.value }); setEditing(null); }}
                  onKeyDown={(e) => { if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); e.stopPropagation(); }}
                  style={{ width: '100%', height: '100%', padding: 8, fontSize: 14, lineHeight: 1.35, resize: 'none', border: '2px solid #2f6fa3', borderRadius: 4, background: 'rgba(255,255,255,.92)', color: INK, boxSizing: 'border-box', outline: 'none' }}
                  aria-label="Shape text"
                />
              </foreignObject>
            )}

            {cursors.map((cu) => (
              <g key={cu.user.id} transform={`translate(${cu.pos.x} ${cu.pos.y}) scale(${1 / view.k})`} pointerEvents="none">
                <path d="M0 0 L0 16 L4.5 12 L8 19 L10.5 18 L7 11 L13 11 Z" fill={cu.user.color} stroke="#fff" strokeWidth={1} />
                <rect x={12} y={14} rx={3} width={cu.user.name.length * 7 + 10} height={18} fill={cu.user.color} />
                <text x={17} y={27} fontSize={11} fontWeight={600} fill="#fff">{cu.user.name}</text>
              </g>
            ))}
          </g>
        </svg>

        {shapes.length === 0 && synced && editable && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-gray-500">
            <div>
              <p className="font-medium text-gray-700">An empty canvas</p>
              <p className="text-sm">Pick a tool on the left, or press R, O, S, T or A. Press I to add an image.</p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-600">Drag blank space or hold Space to pan · Ctrl/⌘ + scroll to zoom · double-click a shape to edit its text · Ctrl+D duplicates · Delete removes</p>
    </div>
  );
}
