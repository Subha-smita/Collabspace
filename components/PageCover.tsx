
'use client';
import { useEffect, useState } from 'react';
import { coverStyle, isPreset } from '@/lib/covers';
import CoverPicker from './CoverPicker';

export default function PageCover({ pageId, cover, editable, onChange }: { pageId: string; cover: string; editable: boolean; onChange: (c: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [cover]);
  return (
    <div className="group relative h-40 w-full overflow-hidden bg-[#ebeae6] sm:h-56" style={isPreset(cover) ? coverStyle(cover) : undefined}>
      {!isPreset(cover) && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      )}
      {broken && <div className="flex h-full items-center justify-center text-sm text-gray-500">Cover image unavailable{editable ? ' — choose another' : ''}</div>}
      {editable && (
        <div className="absolute bottom-3 right-4 flex gap-1 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button type="button" className="rounded-md bg-white/90 px-2.5 py-1 text-xs shadow-sm transition-colors hover:bg-white" onClick={() => setOpen(true)}>Change cover</button>
          <button type="button" className="rounded-md bg-white/90 px-2.5 py-1 text-xs shadow-sm transition-colors hover:bg-white" onClick={() => onChange(null)}>Remove</button>
        </div>
      )}
      {open && <CoverPicker pageId={pageId} onPick={(c) => { setOpen(false); onChange(c); }} onRemove={() => { setOpen(false); onChange(null); }} onClose={() => setOpen(false)} />}
    </div>
  );
}
