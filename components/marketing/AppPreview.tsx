const COLS = [
  { name: 'To-do', tint: 'bg-[#f1f0ee]', cards: ['Draft launch notes', 'Review onboarding copy'] },
  { name: 'In progress', tint: 'bg-sand', cards: ['Weekly design sync', 'Update help docs'] },
  { name: 'In review', tint: 'bg-accent-soft', cards: ['Pricing page'] },
  { name: 'Complete', tint: 'bg-sage', cards: ['Project kickoff', 'Set up workspace'] },
];

export default function AppPreview() {
  return (
    <div role="img" aria-label="Preview of the CollabSpace task board" className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-[#e9e9e7] bg-white shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-[#e9e9e7] px-4 py-2" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#e3e2de]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e3e2de]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e3e2de]" />
      </div>
      <div className="flex" aria-hidden>
        <div className="hidden w-48 shrink-0 space-y-2 border-r border-[#e9e9e7] bg-[#f7f6f3] p-3 text-sm sm:block">
          <div className="rounded bg-accent-soft px-2 py-1 font-medium text-accent-dark">Home</div>
          <div className="px-2 pt-2 text-xs font-semibold uppercase text-gray-500">Workspaces</div>
          <div className="px-2">Product team</div>
          <div className="ml-3 space-y-1 border-l pl-2 text-gray-700">
            <div>Tasks</div>
            <div>Roadmap</div>
            <div>Meeting notes</div>
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4 text-left">
          <div className="mb-3 text-xl font-semibold">Tasks</div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.name} className={`rounded p-2 ${c.tint}`}>
                <div className="mb-2 px-1 text-sm font-medium">{c.name}</div>
                <div className="space-y-2">
                  {c.cards.map((t) => (
                    <div key={t} className="rounded border border-[#e9e9e7] bg-white p-2 text-sm shadow-sm">{t}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}