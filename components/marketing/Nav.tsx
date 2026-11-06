'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const PRODUCT = [
  { href: '#write', title: 'Write', desc: 'Rich pages with / commands' },
  { href: '#collaborate', title: 'Collaborate', desc: 'Live cursors, comments, history' },
  { href: '#organize', title: 'Organize', desc: 'Workspaces, roles and tasks' },
];

export default function MarketingNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[#e9e9e7] bg-[#fbfbfa]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="h-3 w-3 rounded-sm bg-accent" />
          CollabSpace
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <div className="relative" ref={ref}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="product-menu"
              onClick={() => setOpen(!open)}
              className="rounded px-3 py-1.5 hover:bg-[#ebeae6]"
            >
              Product <span aria-hidden>{open ? '▴' : '▾'}</span>
            </button>
            {open && (
              <div id="product-menu" className="absolute left-0 top-full mt-2 w-72 max-w-[90vw] rounded-lg border border-[#e9e9e7] bg-white p-2 shadow-lg">
                {PRODUCT.map((p) => (
                  <a key={p.href} href={p.href} onClick={() => setOpen(false)} className="block rounded px-3 py-2 hover:bg-accent-soft">
                    <span className="block font-medium">{p.title}</span>
                    <span className="block text-xs text-gray-600">{p.desc}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <a href="#pricing" className="rounded px-3 py-1.5 hover:bg-[#ebeae6]">Pricing</a>
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded px-3 py-1.5 hover:bg-[#ebeae6]">Log in</Link>
          <Link href="/register" className="rounded bg-accent px-3 py-1.5 text-white hover:bg-accent-dark">Get started free</Link>
        </div>
      </div>
    </header>
  );
}