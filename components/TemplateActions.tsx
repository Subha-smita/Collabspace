'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { N, ShapeSeed } from '@/lib/templates';
import { createFromTemplate } from '@/lib/templateClient';
import TemplatePreviewModal from './TemplatePreviewModal';

type W = { id: string; name: string };
type Props = { cover?: string | null; category?: string; desc?: string; tplRef: string; name: string; kind: 'DOC' | 'CANVAS'; icon?: string | null; canvasKey?: string; workspaces: W[]; doc?: N; shapes?: ShapeSeed[] };

/** "Add" + "Preview" buttons for the template detail page. */
export default function TemplateActions({ cover, category, desc, tplRef, name, kind, icon, canvasKey, workspaces, doc, shapes }: Props) {
  const router = useRouter();
  const [wid, setWid] = useState(workspaces[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  async function add() {
    setBusy(true); setErr('');
    const r = await createFromTemplate({ workspaceId: wid, tplRef, title: name, kind, icon, canvasKey });
    if ('error' in r) { setBusy(false); setErr(r.error); return; }
    router.push(r.href);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {workspaces.length > 1 && (
        <label className="flex items-center gap-2 text-sm text-gray-600">Add to
          <select value={wid} onChange={(e) => setWid(e.target.value)}>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        </label>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={add} disabled={busy || !wid} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#2383e2] text-base font-medium text-white transition-colors hover:bg-[#0b6ec5] disabled:opacity-60">
          <span aria-hidden className="text-xl leading-none">+</span>{busy ? 'Adding…' : 'Use template'}
        </button>
        <button type="button" onClick={() => setOpen(true)} className="h-11 flex-1 rounded-lg bg-[#e7f1fb] text-base font-medium text-[#2383e2] transition-colors hover:bg-[#d6e8f8]">Preview</button>
      </div>
      {!wid && <p className="text-sm text-red-700">Create a workspace first.</p>}
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}

      {open && <TemplatePreviewModal name={name} desc={desc} icon={icon} cover={cover} category={category} doc={doc} shapes={shapes} busy={busy} canUse={!!wid} onUse={add} onClose={() => setOpen(false)} />}
    </div>
  );
}
