'use client';
import { useEffect, useState } from 'react';
import type { N, ShapeSeed } from '@/lib/templates';
import { coverStyle, isPreset } from '@/lib/covers';
import TemplatePreview from './TemplatePreview';

type Props = { name: string; desc?: string; icon?: string | null; cover?: string | null; category?: string; doc?: N; shapes?: ShapeSeed[]; busy?: boolean; canUse?: boolean; onUse: () => void; onClose: () => void };

/** Full read-only preview: cover, title and every block of the template. */
export default function TemplatePreviewModal({ name, desc, icon, cover, category, doc, shapes, busy, canUse = true, onUse, onClose }: Props) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={`Preview of ${name}`} className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#e9e9e7] px-4 py-3 sm:px-5">
          <span className="min-w-0 truncate font-medium"><span aria-hidden>{icon} </span>{name}{category && <span className="badge ml-2 align-middle">{category}</span>}</span>
          <div className="flex shrink-0 items-center gap-2">
            {canUse && <button type="button" onClick={onUse} disabled={busy} className="btn h-9">{busy ? 'Adding…' : 'Use template'}</button>}
            <button type="button" autoFocus onClick={onClose} aria-label="Close preview" className="h-9 rounded-md px-3 text-sm transition-colors hover:bg-[#ebeae6]">Close</button>
          </div>
        </div>
        <div className="overflow-y-auto">
          {cover && (
            <div className="h-32 w-full overflow-hidden bg-[#ebeae6] sm:h-44" style={isPreset(cover) ? coverStyle(cover) : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {!isPreset(cover) && !broken && <img src={cover} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />}
            </div>
          )}
          <div className="px-5 py-6 sm:px-10">
            {icon && <div className="text-5xl leading-none" aria-hidden>{icon}</div>}
            <h2 className="mb-1 mt-3 text-3xl font-bold">{name}</h2>
            {desc && <p className="mb-4 text-gray-600">{desc}</p>}
            <TemplatePreview doc={doc} shapes={shapes} />
          </div>
        </div>
      </div>
    </div>
  );
}
