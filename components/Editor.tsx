'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Comments, Versions, type Perm } from './Panels';
import { getTemplate } from '@/lib/templates';
import { uploadImage } from '@/lib/uploadClient';
import { SlashMenu, filterCommands } from './SlashMenu';
import EmojiPicker from './EmojiPicker';
import PageCover from './PageCover';
import CoverPicker from './CoverPicker';
import LayoutMenu, { type Layout } from './LayoutMenu';
import Icon from './Icon';
import EditorToolbar from './EditorToolbar';
import { Callout, Toggle } from '@/lib/blocks';

type U = { id: string; name: string; color: string };
type Props = { pageId: string; title: string; icon: string | null; cover: string | null; fullWidth: boolean; smallText: boolean; hidePanel: boolean; template?: string; perm: Perm; user: U; collabUrl: string; canManage: boolean };
type Slash = { query: string; from: number; to: number; index: number; left: number; top?: number; bottom?: number };

export default function Editor(p: Props) {
  const [c, setC] = useState<{ doc: Y.Doc; provider: WebsocketProvider } | null>(null);
  useEffect(() => {
    const doc = new Y.Doc();
    let off = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let provider: WebsocketProvider | undefined;
    // Auth: the session cookie when the collab host receives it, otherwise a short-lived ticket in the URL (refreshed for reconnects).
    const ticket = async () => {
      try {
        const r = await fetch('/api/collab-ticket');
        return r.ok ? ((await r.json()).ticket as string) : null;
      } catch {
        return null;
      }
    };
    (async () => {
      const t = await ticket();
      if (off) return;
      provider = new WebsocketProvider(p.collabUrl, p.pageId, doc, { params: t ? { ticket: t } : {} });
      setC({ doc, provider });
      timer = setInterval(async () => {
        const n = await ticket();
      if (n && provider) provider.params = { ticket: n };
      }, 120_000);
    })();
    return () => {
      off = true;
      if (timer) clearInterval(timer);
      provider?.destroy();
      doc.destroy();
      setC(null);
    };
  }, [p.collabUrl, p.pageId]);
  return c ? <Inner {...p} {...c} /> : <div className="p-8 text-gray-600">Loading editor…</div>;
}

function Inner({ pageId, title, icon: initialIcon, cover: initialCover, fullWidth, smallText, hidePanel, template, perm, user, doc, provider }: Props & { doc: Y.Doc; provider: WebsocketProvider }) {
  const router = useRouter();
  const [status, setStatus] = useState('connecting');
  const [synced, setSynced] = useState(false);
  const [peers, setPeers] = useState<U[]>([]);
  const [tab, setTab] = useState<'comments' | 'history'>('comments');
  const [name, setName] = useState(title);
  const [save, setSave] = useState<'saved' | 'saving'>('saved');
  const [icon, setIcon] = useState(initialIcon);
  const [cover, setCover] = useState(initialCover);
  const [layout, setLayoutState] = useState<Layout>({ fullWidth, smallText, hidePanel });
  const [coverPicker, setCoverPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tplApplied = useRef(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [picker, setPicker] = useState<'icon' | 'text' | null>(null);

  const [slash, setSlash] = useState<Slash | null>(null);
  const slashRef = useRef<Slash | null>(null);
  slashRef.current = slash;
  const dismissed = useRef<number | null>(null);
  const pickRef = useRef<(i: number) => void>(() => {});
  const editable = perm === 'EDIT';

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable,
      extensions: [
        StarterKit.configure({ history: false }), // Yjs undo manager replaces history
        Underline,
        Link.configure({ openOnClick: false }),
        ImageExt,
        Placeholder.configure({ placeholder: editable ? "Type '/' for commands…" : '' }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        Callout,
        Toggle,
        Collaboration.configure({ document: doc }),
        CollaborationCursor.configure({ provider, user }),
      ],
      editorProps: {
        handleKeyDown: (_view, e) => {
          const s = slashRef.current;
          if (!s) return false;
          if (e.key === 'Escape') { dismissed.current = s.from; setSlash(null); return true; }
          const n = filterCommands(s.query).length;
          if (!n) return false;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const d = e.key === 'ArrowDown' ? 1 : n - 1;
            setSlash((c) => c && { ...c, index: (c.index + d) % n });
            return true;
          }
          if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickRef.current(s.index); return true; }
          return false;
        },
      },
    },
    [doc, provider],
  );

  pickRef.current = (i: number) => {
    const s = slashRef.current;
    const cmd = s ? filterCommands(s.query)[i] : undefined;
    if (!editor || !s || !cmd) return;
    cmd.run(editor, { from: s.from, to: s.to });
    setSlash(null);
  };

  // Slash menu: open when the text before the cursor ends with "/query" at the start of a word.
  useEffect(() => {
    if (!editor) return;
    const detect = () => {
      const close = () => setSlash((s) => (s ? null : s));
      try {
        const { $from, empty } = editor.state.selection;
        if (!editor.isEditable || !empty || !$from.parent.isTextblock || $from.parent.type.name === 'codeBlock') return close();
        const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
        const m = /(?:^|\s)\/([\w-]*)$/.exec(before);
        if (!m) { dismissed.current = null; return close(); }
        const to = $from.pos;
        const from = to - m[1].length - 1;
        if (dismissed.current === from) return close();
        const c = editor.view.coordsAtPos(to);
        const up = c.bottom + 280 > window.innerHeight;
        const next = {
          query: m[1], from, to,
          left: Math.max(8, Math.min(c.left, window.innerWidth - 272)),
          ...(up ? { bottom: window.innerHeight - c.top + 4 } : { top: c.bottom + 4 }),
        };
        setSlash((s) => ({ ...next, index: s && s.query === next.query ? s.index : 0 }));
      } catch {
        close();
      }
    };
    editor.on('transaction', detect);
    window.addEventListener('scroll', detect, true);
    return () => {
      editor.off('transaction', detect);
      window.removeEventListener('scroll', detect, true);
    };
  }, [editor]);

  useEffect(() => {
    const aw = provider.awareness;
    const onPeers = () => {
      const m = new Map<string, U>();
      aw.getStates().forEach((s) => s.user && m.set(s.user.id, s.user));
      setPeers([...m.values()]);
    };
    const onStatus = (e: { status: string }) => setStatus(e.status);
    const onSync = (s: boolean) => setSynced(s);
    provider.on('status', onStatus);
    provider.on('sync', onSync);
    aw.on('change', onPeers);
    onPeers();
    return () => {
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      aw.off('change', onPeers);
    };
  }, [provider]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onUpdate = (_u: Uint8Array, origin: unknown) => {
      if (origin === provider) return; // update received from the server, not a local edit
      setSave('saving');
      clearTimeout(t);
      t = setTimeout(() => { if (provider.wsconnected && provider.synced) setSave('saved'); }, 1200);
    };
    const onSync = (s: boolean) => { if (s) setSave('saved'); };
    doc.on('update', onUpdate);
    provider.on('sync', onSync);
    return () => {
      doc.off('update', onUpdate);
      provider.off('sync', onSync);
      clearTimeout(t);
    };
  }, [doc, provider]);

  const rename = async () => {
    if (!editable || !name.trim() || name === title) return;
    const r = await fetch(`/api/pages/${pageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: name }) });
    if (r.ok) router.refresh();
  };
  const patchPage = async (body: Record<string, unknown>, revert: () => void) => {
    const r = await fetch(`/api/pages/${pageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) revert();
    else router.refresh();
  };
  const saveIcon = (v: string | null) => {
    setPicker(null);
    const prev = icon;
    setIcon(v);
    patchPage({ icon: v ?? '' }, () => setIcon(prev));
  };
  const saveCover = (v: string | null) => {
    setCoverPicker(false);
    const prev = cover;
    setCover(v);
    patchPage({ cover: v }, () => setCover(prev));
  };
  const setLayout = (k: keyof Layout, v: boolean) => {
    const prev = layout;
    setLayoutState({ ...layout, [k]: v });
    patchPage({ [k]: v }, () => setLayoutState(prev));
  };
  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !editor) return;
    setUploading(true);
    try {
      const url = await uploadImage(pageId, f);
      editor.chain().focus().setImage({ src: url, alt: f.name }).run();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
  };
  // Fill a brand-new page from its template once, after the document has synced.
  useEffect(() => {
    if (!template || tplApplied.current || !editor || !synced || !editable) return;
    tplApplied.current = true;
    const tpl = getTemplate(template);
    if (tpl?.doc && editor.isEmpty) editor.commands.setContent(tpl.doc as JSONContent);
    window.history.replaceState(null, '', window.location.pathname);
  }, [template, editor, synced, editable]);
  const setLink = () => {
    const url = window.prompt('URL (empty to remove)');
    if (url === null || !editor) return;
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };

  const live = status === 'connected';
  const tabs = ['comments', 'history'] as ('comments' | 'history')[];
  const items = slash ? filterCommands(slash.query) : [];

  return (
    <div>
      {coverPicker && !cover && <CoverPicker pageId={pageId} onPick={saveCover} onClose={() => setCoverPicker(false)} />}
      {cover && <PageCover pageId={pageId} cover={cover} editable={editable} onChange={saveCover} />}
      <div className={`mx-auto grid gap-10 px-6 py-8 ${layout.fullWidth ? 'max-w-none' : 'max-w-6xl'} ${layout.hidePanel ? '' : 'lg:grid-cols-[1fr_300px]'}`}>
        <section className={`mx-auto w-full min-w-0 px-2 py-4 ${layout.fullWidth ? 'max-w-none' : 'max-w-3xl'} ${layout.smallText ? 'small-text' : ''}`}>
          <div className={`relative ${cover && icon ? '-mt-12' : ''}`}>
            {icon && (
              <button type="button" disabled={!editable} onClick={() => setPicker(picker === 'icon' ? null : 'icon')} className="rounded-lg p-1 text-7xl leading-none hover:bg-[#ebeae6] disabled:hover:bg-transparent" aria-label="Page icon">
                {icon}
              </button>
            )}
            {editable && (
              <div className="mb-1 flex flex-wrap items-center gap-1 text-sm text-gray-500 opacity-70 transition-opacity focus-within:opacity-100 hover:opacity-100">
                {!icon && (
                  <button type="button" className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#ebeae6]" onClick={() => setPicker(picker === 'icon' ? null : 'icon')}>
                    <Icon name="smile" />Add icon
                  </button>
                )}
                {!cover && (
                  <button type="button" className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#ebeae6]" onClick={() => setCoverPicker(true)}>
                    <Icon name="image" />Add cover
                  </button>
                )}
                <div className="relative">
                  <button type="button" aria-expanded={layoutOpen} className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[#ebeae6]" onClick={() => setLayoutOpen(!layoutOpen)}>
                    <Icon name="layout" />Customize layout
                  </button>
                  {layoutOpen && <LayoutMenu layout={layout} onChange={setLayout} onClose={() => setLayoutOpen(false)} />}
                </div>
              </div>
            )}
            {picker === 'icon' && <EmojiPicker onPick={saveIcon} onRemove={icon ? () => saveIcon(null) : undefined} onClose={() => setPicker(null)} />}
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <input
              className="w-full max-w-md border-0 bg-transparent px-0 text-4xl font-bold focus:outline-none"
              value={name}
              readOnly={!editable}
              onChange={(e) => setName(e.target.value)}
              onBlur={rename}
              aria-label="Page title"
            />
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {peers.map((p) => (
                  <span key={p.id} title={p.name} style={{ background: p.color }} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                ))}
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${live ? (synced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') : 'bg-red-100 text-red-800'}`}>
                {live ? (synced ? 'Live' : 'Syncing…') : 'Offline – retrying'}
              </span>
              {editable && (
                <span role="status" aria-live="polite" className="text-xs text-gray-600">
                  {!live ? 'Changes sync when you reconnect' : save === 'saving' ? 'Saving…' : 'Saved'}
                </span>
              )}
            </div>
          </div>
          {editable ? (
            <div className="relative">
              {editor && <EditorToolbar editor={editor} uploading={uploading} onUploadImage={() => fileRef.current?.click()} onLink={setLink} emojiOpen={picker === 'text'} onEmoji={() => setPicker(picker === 'text' ? null : 'text')} />}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={onPickImage} aria-label="Upload image from your computer" />
              {picker === 'text' && <div className="absolute left-0 top-full z-40"><EmojiPicker onPick={(e) => { editor?.chain().focus().insertContent(e).run(); setPicker(null); }} onClose={() => setPicker(null)} /></div>}
            </div>
          ) : (
            <p className="mb-3 rounded bg-gray-100 px-3 py-1 text-sm text-gray-600">You have {perm.toLowerCase()} access — editing is disabled.</p>
          )}
          <EditorContent editor={editor} />
          {slash && (
            <SlashMenu
              items={items}
              index={Math.min(slash.index, Math.max(items.length - 1, 0))}
              style={{ left: slash.left, top: slash.top, bottom: slash.bottom }}
              onPick={(i) => pickRef.current(i)}
              onHover={(i) => setSlash((c) => c && { ...c, index: i })}
            />
          )}
        </section>

        {!layout.hidePanel && (
          <aside className="rounded border border-[#e9e9e7] bg-white p-4 lg:self-start">
            <div className="mb-3 flex gap-3 border-b pb-2 text-sm">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`capitalize ${tab === t ? 'font-semibold underline' : 'text-gray-600'}`}>{t}</button>
              ))}
            </div>
            {tab === 'comments' && <Comments pageId={pageId} perm={perm} userId={user.id} />}
            {tab === 'history' && <Versions pageId={pageId} perm={perm} doc={doc} />}
          </aside>
        )}
      </div>
    </div>
  );
}