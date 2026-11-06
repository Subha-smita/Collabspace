'use client';
import { useEffect, useRef } from 'react';

export type Layout = { fullWidth: boolean; smallText: boolean; hidePanel: boolean };

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-[#c9c8c4]'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function LayoutMenu({ layout, onChange, onClose }: { layout: Layout; onChange: (k: keyof Layout, v: boolean) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [onClose]);
  const rows: [keyof Layout, string, string, boolean][] = [
    ['fullWidth', 'Full width', 'Use the whole screen width', layout.fullWidth],
    ['smallText', 'Small text', 'Smaller text in the page body', layout.smallText],
    ['hidePanel', 'Hide side panel', 'Hide comments, history and sharing', layout.hidePanel],
  ];
  return (
    <div ref={ref} role="dialog" aria-label="Customize layout" className="absolute left-0 z-30 mt-1 w-72 rounded-lg border border-[#e9e9e7] bg-white p-3 text-sm shadow-lg">
      <div className="mb-2 font-medium text-[#37352f]">Customize layout</div>
      <ul className="space-y-3">
        {rows.map(([k, label, desc, on]) => (
          <li key={k} className="flex items-center justify-between gap-3 text-[#37352f]">
            <div><div>{label}</div><div className="text-xs text-gray-600">{desc}</div></div>
            <Switch on={on} label={label} onChange={(v) => onChange(k, v)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
