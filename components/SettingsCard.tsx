import type { ReactNode } from 'react';

/** A titled card used on every Settings page. `rows` lays children out as a divided list of settings. */
export default function SettingsCard({ title, desc, rows, children }: { title: string; desc?: string; rows?: boolean; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-[#e9e9e7] px-6 py-4">
        <h3 className="font-semibold">{title}</h3>
        {desc && <p className="mt-0.5 text-sm text-gray-600">{desc}</p>}
      </div>
      <div className={rows ? 'divide-y divide-[#e9e9e7] px-6' : 'px-6 py-5'}>{children}</div>
    </section>
  );
}
