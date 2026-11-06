'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { STATUS_LABEL } from '@/lib/taskMeta';

type Hit = { key: string; label: string; sub: string; href: string; kind: 'Page' | 'Task' };

export default function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open) { setQ(''); setHits([]); setI(0); } }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!open || !term) { setHits([]); setBusy(false); return; }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const d = await r.json();
        if (!r.ok) throw new Error('search failed');
        setHits([
          ...d.pages.map((p: { id: string; title: string; workspace: { name: string } }) => ({ key: `p${p.id}`, label: p.title, sub: p.workspace.name, href: `/pages/${p.id}`, kind: 'Page' as const })),
          ...d.tasks.map((t: { id: string; title: string; status: string; workspaceId: string; workspace: { name: string } }) => ({
            key: `t${t.id}`, label: t.title, sub: `${t.workspace.name} · ${STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] ?? t.status}`,
            href: `/workspaces/${t.workspaceId}/tasks`, kind: 'Task' as const,
          })),
        ]);
        setI(0);
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      }
      if (!ctrl.signal.aborted) setBusy(false);
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, open]);

  const close = () => { setOpen(false); trigger.current?.focus(); };
  const go = (h?: Hit) => { if (!h) return; setOpen(false); router.push(h.href); };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm text-gray-600 hover:bg-[#ebeae6]"
      >
        <span>Search</span>
        <kbd className="rounded border border-[#e3e2de] bg-white px-1 text-xs">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[15vh]" onMouseDown={close}>
          <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-lg overflow-hidden rounded-lg border border-[#e9e9e7] bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
            <input
              autoFocus
              role="combobox"
              aria-expanded={hits.length > 0}
              aria-controls="search-results"
              aria-activedescendant={hits.length ? `hit-${i}` : undefined}
              className="w-full rounded-none border-0 border-b border-[#e9e9e7] px-4 py-3 text-base"
              placeholder="Search pages and tasks…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); close(); }
                else if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setI((i + 1) % hits.length); }
                else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setI((i + hits.length - 1) % hits.length); }
                else if (e.key === 'Enter') { e.preventDefault(); go(hits[i]); }
              }}
            />
            <ul id="search-results" role="listbox" className="max-h-80 overflow-y-auto p-1">
              {!q.trim() && <li className="px-3 py-2 text-sm text-gray-600">Type to search page and task titles.</li>}
              {q.trim() && !busy && hits.length === 0 && <li className="px-3 py-2 text-sm text-gray-600">No results</li>}
              {hits.map((h, n) => (
                <li
                  key={h.key}
                  id={`hit-${n}`}
                  role="option"
                  aria-selected={n === i}
                  onMouseEnter={() => setI(n)}
                  onClick={() => go(h)}
                  className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm ${n === i ? 'bg-accent-soft' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{h.label}</span>
                    <span className="block truncate text-xs text-gray-600">{h.sub}</span>
                  </span>
                  <span className="ml-3 text-xs text-gray-600">{h.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}