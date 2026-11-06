'use client';
import { useEffect, useRef, useState } from 'react';
import { COVER_PRESETS, COVER_RE, coverStyle, isPreset } from '@/lib/covers';
import { uploadImage } from '@/lib/uploadClient';
import Icon from './Icon';

type Draft = { src: string; value?: string; file?: File } | null;
const TABS = [['upload', 'Upload'], ['link', 'Link'], ['gallery', 'Gallery']] as const;

/** Centered modal (fixed to the viewport, so it can never be clipped by the cover or the page layout). */
export default function CoverPicker({ pageId, onPick, onRemove, onClose }: { pageId: string; onPick: (c: string) => void; onRemove?: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('upload');
  const [draft, setDraft] = useState<Draft>(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const objUrl = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; if (objUrl.current) URL.revokeObjectURL(objUrl.current); };
  }, [onClose]);

  const setFile = (f?: File) => {
    if (!f) return;
    setErr('');
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) return setErr('Choose a PNG, JPEG, GIF or WebP image');
    if (f.size > 5 * 1024 * 1024) return setErr('Image is too large (max 5 MB)');
    if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    objUrl.current = URL.createObjectURL(f); // preview only; the saved cover is the uploaded copy
    setDraft({ src: objUrl.current, file: f });
  };
  const checkUrl = () => {
    const v = url.trim();
    setErr('');
    if (!/^https:\/\//.test(v) || !COVER_RE.test(v)) return setErr('Enter a link starting with https://');
    setBusy(true);
    const img = new Image();
    img.onload = () => { setBusy(false); setDraft({ src: v, value: v }); };
    img.onerror = () => { setBusy(false); setDraft(null); setErr('That image could not be loaded. Check the link or try another image.'); };
    img.src = v;
  };
  const apply = async () => {
    if (!draft) return;
    setErr('');
    if (draft.file) {
      setBusy(true);
      try { onPick(await uploadImage(pageId, draft.file)); } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed'); setBusy(false); }
      return;
    }
    if (draft.value) onPick(draft.value);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Choose a cover" className="flex max-h-[90vh] w-[min(92vw,32rem)] flex-col overflow-hidden rounded-xl border border-[#e9e9e7] bg-white text-sm shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e9e9e7] px-4 py-3">
          <span className="font-medium">Page cover</span>
          <div className="flex items-center gap-2">
            {onRemove && <button type="button" className="row-action-danger" onClick={onRemove}>Remove</button>}
            <button type="button" aria-label="Close" className="rounded p-1 hover:bg-[#ebeae6]" onClick={onClose}><Icon name="x" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-4">
          <div role="tablist" className="mb-4 flex rounded-lg bg-[#ebeae6] p-1">
            {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setErr(''); }} className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${tab === k ? 'bg-white font-medium shadow-sm' : 'text-gray-600 hover:text-[#37352f]'}`}>{l}</button>)}
          </div>

          {tab === 'upload' && (
            <div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" aria-label="Upload a cover image" onChange={(e) => { setFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0]); }}
                className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#d3d2ce] px-4 py-8 text-gray-600 transition-colors hover:border-[#2383e2] hover:bg-[#f7fbff]">
                <Icon name="upload" size={22} /><span>Click to choose an image, or drop one here</span><span className="text-xs text-gray-500">PNG, JPEG, GIF or WebP · up to 5 MB</span>
              </button>
            </div>
          )}
          {tab === 'link' && (
            <form onSubmit={(e) => { e.preventDefault(); checkUrl(); }} className="space-y-2">
              <label htmlFor="cover-url" className="block text-gray-600">Paste an image link</label>
              <div className="flex gap-2">
                <input id="cover-url" autoFocus className="min-w-0 flex-1" placeholder="https://…" value={url} onChange={(e) => { setUrl(e.target.value); setErr(''); }} />
                <button className="btn-secondary" disabled={busy || !url.trim()}>{busy ? 'Checking…' : 'Preview'}</button>
              </div>
            </form>
          )}
          {tab === 'gallery' && (
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(COVER_PRESETS).map((k) => (
                <button key={k} type="button" aria-label={`${k} cover`} title={k} className="h-12 rounded-md border border-[#e9e9e7] transition hover:ring-2 hover:ring-accent" style={coverStyle(`preset:${k}`)} onClick={() => { setErr(''); setDraft({ src: `preset:${k}`, value: `preset:${k}` }); }} />
              ))}
            </div>
          )}

          {err && <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-red-700">{err}</p>}
          {draft && (
            <div className="mt-4">
              <p className="mb-1 text-xs text-gray-500">Preview</p>
              <div className="h-24 w-full overflow-hidden rounded-lg border border-[#e9e9e7] sm:h-28" style={isPreset(draft.src) ? coverStyle(draft.src) : undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {!isPreset(draft.src) && <img src={draft.src} alt="Cover preview" className="h-full w-full object-cover" />}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e9e9e7] px-4 py-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" disabled={!draft || busy} onClick={apply}>{busy && draft?.file ? 'Uploading…' : 'Apply cover'}</button>
        </div>
      </div>
    </div>
  );
}
