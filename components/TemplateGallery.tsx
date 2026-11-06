'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CATEGORIES, TEMPLATES, type N, type Template } from '@/lib/templates';
import { createFromTemplate } from '@/lib/templateClient';
import { templateCoverUrl } from '@/lib/templateCover';
import { coverStyle, isPreset } from '@/lib/covers';
import TemplatePreview from './TemplatePreview';
import TemplatePreviewModal from './TemplatePreviewModal';

type W = { id: string; name: string };
export type CustomT = { id: string; name: string; description: string; icon: string | null; uses: number; cover: string | null; content: N };
type Cat = (typeof CATEGORIES)[number];

const CAT_ICON: Record<string, string> = { All: '✨', 'Project Management': '📌', 'Personal Planning': '🌱', 'Education & Study': '🎓', 'Business & Work': '💼', 'Meeting Notes': '📝', 'Content Planning': '🗓️', Productivity: '⚡' };

function Banner({ src }: { src: string | null }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className="h-full w-full bg-gradient-to-br from-[#ebeae6] to-[#dcdbd7]" />;
  if (isPreset(src)) return <div className="h-full w-full" style={coverStyle(src)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setBad(true)} />;
}

/** Banner + a miniature of the real template content. All cards use the same fixed dimensions. */
function Thumb({ cover, doc, shapes, badge }: { cover: string | null; doc?: N; shapes?: Template['shapes']; badge: string }) {
  return (
    <div className="relative">
      <div className="h-28 overflow-hidden"><Banner src={cover} /></div>
      <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-0.5 text-xs text-gray-700 shadow-sm backdrop-blur">{badge}</span>
      <div aria-hidden className="relative -mt-9 mx-5 h-36 overflow-hidden rounded-t-lg border border-b-0 border-[#e9e9e7] bg-white shadow-sm">
        {shapes?.length ? (
          <div className="p-3"><TemplatePreview shapes={shapes} /></div>
        ) : (
          <div className="pointer-events-none w-[270%] origin-top-left p-5" style={{ transform: 'scale(.37)' }}><TemplatePreview doc={doc} /></div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  );
}

export default function TemplateGallery({ workspaces, custom, stats, initialTab }: { workspaces: W[]; custom: CustomT[]; stats: Record<string, number>; initialTab: 'gallery' | 'mine' }) {
  const router = useRouter();
  const [tab, setTab] = useState<'gallery' | 'mine'>(initialTab);
  const [cat, setCat] = useState<Cat>('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'featured' | 'az'>('featured');
  const [wid, setWid] = useState(workspaces[0]?.id ?? '');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<Template | null>(null);

  const term = q.trim().toLowerCase();
  const list: Template[] = useMemo(() => {
    const out = TEMPLATES.filter((t) => (cat === 'All' || t.category === cat) && (!term || `${t.name} ${t.desc} ${t.category}`.toLowerCase().includes(term)));
    return sort === 'az' ? [...out].sort((a, b) => a.name.localeCompare(b.name)) : out;
  }, [cat, term, sort]);
  const mine = useMemo(() => custom.filter((c) => !term || `${c.name} ${c.description}`.toLowerCase().includes(term)), [custom, term]);
  const featured = TEMPLATES.filter((t) => t.featured);
  const popular = [...TEMPLATES].filter((t) => (stats[t.key] ?? 0) > 0).sort((a, b) => (stats[b.key] ?? 0) - (stats[a.key] ?? 0)).slice(0, 3);
  const sections = tab === 'gallery' && cat === 'All' && !term;

  async function useCustom(c: CustomT) {
    setBusy(c.id); setErr('');
    const r = await createFromTemplate({ workspaceId: wid, tplRef: `custom:${c.id}`, title: c.name, kind: 'DOC', icon: c.icon });
    setBusy('');
    if ('error' in r) return setErr(r.error);
    router.push(r.href);
    router.refresh();
  }
  async function rename(c: CustomT) {
    const name = window.prompt('Rename template', c.name)?.trim();
    if (!name || name === c.name) return;
    const r = await fetch(`/api/templates/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? 'Could not rename');
    router.refresh();
  }
  async function remove(c: CustomT) {
    if (!window.confirm(`Delete the template "${c.name}"? Pages already created from it are not affected.`)) return;
    const r = await fetch(`/api/templates/${c.id}`, { method: 'DELETE' });
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? 'Could not delete');
    router.refresh();
  }

  async function useBuiltin(t: Template) {
    setBusy(t.key); setErr('');
    const r = await createFromTemplate({ workspaceId: wid, tplRef: `builtin:${t.key}`, title: t.name, kind: t.kind, icon: t.icon, canvasKey: t.kind === 'CANVAS' ? t.key : undefined });
    setBusy('');
    if ('error' in r) return setErr(r.error);
    router.push(r.href);
    router.refresh();
  }
  const shell = 'group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e9e9e7] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md';
  const card = (t: Template, note?: string) => (
    <li key={t.key} className={shell}>
      <Link href={`/templates/${t.key}`} className="block focus-visible:outline-none" aria-label={`Open ${t.name}`}>
        <Thumb cover={templateCoverUrl(t.key)} doc={t.doc} shapes={t.shapes} badge={t.category} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2"><span aria-hidden className="text-xl">{t.icon}</span><h3 className="min-w-0 flex-1 truncate text-base font-semibold text-[#37352f]">{t.name}</h3></div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{t.desc}</p>
        {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
        <div className="mt-auto flex gap-2 pt-4">
          <button type="button" className="btn-secondary flex-1" onClick={() => setPreview(t)}>Preview</button>
          <button type="button" className="btn flex-1" disabled={!!busy || !wid} onClick={() => useBuiltin(t)}>{busy === t.key ? 'Adding…' : 'Use template'}</button>
        </div>
      </div>
    </li>
  );
  const grid = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3';
  const head = (text: string, sub?: string) => <div className="mb-4 flex items-baseline gap-3"><h2 className="text-xl font-semibold">{text}</h2>{sub && <span className="text-sm text-gray-500">{sub}</span>}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Template views" className="flex rounded-lg bg-[#ebeae6] p-1 text-sm">
          {([['gallery', 'Gallery'], ['mine', `My templates (${custom.length})`]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 transition-colors ${tab === k ? 'bg-white font-medium shadow-sm' : 'text-gray-600 hover:text-[#37352f]'}`}>{label}</button>
          ))}
        </div>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" aria-label="Search templates" className="h-9 w-full sm:max-w-xs" />
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-gray-600">
          {workspaces.length > 1 && (
            <label className="flex items-center gap-2">Create in
              <select value={wid} onChange={(e) => setWid(e.target.value)}>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            </label>
          )}
          {tab === 'gallery' && (
            <label className="flex items-center gap-2">Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as 'featured' | 'az')}><option value="featured">Featured</option><option value="az">A to Z</option></select>
            </label>
          )}
        </div>
      </div>

      {tab === 'gallery' && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Template categories">
          {CATEGORIES.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${cat === c ? 'border-[#37352f] bg-[#37352f] text-white' : 'border-[#e3e2de] bg-white text-[#37352f] hover:bg-[#f1f0ee]'}`}>
              <span aria-hidden>{CAT_ICON[c]}</span>{c}
            </button>
          ))}
        </div>
      )}

      {preview && <TemplatePreviewModal name={preview.name} desc={preview.desc} icon={preview.icon} cover={templateCoverUrl(preview.key)} category={preview.category} doc={preview.doc} shapes={preview.shapes} busy={busy === preview.key} canUse={!!wid} onUse={() => useBuiltin(preview)} onClose={() => setPreview(null)} />}
      {err && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {tab === 'gallery' && sections && (
        <>
          <section aria-label="Featured templates">{head('Featured', 'Hand-picked to get you started')}<ul className={grid}>{featured.map((t) => card(t))}</ul></section>
          {popular.length > 0 && <section aria-label="Popular templates">{head('Popular', 'Most used by people in CollabSpace')}<ul className={grid}>{popular.map((t) => card(t, `Used ${stats[t.key]} time${stats[t.key] === 1 ? '' : 's'}`))}</ul></section>}
        </>
      )}
      {tab === 'gallery' && (
        <section aria-label="All templates">
          {head(sections ? 'All templates' : `${list.length} template${list.length === 1 ? '' : 's'}`)}
          <ul className={grid}>{list.map((t) => card(t))}</ul>
          {list.length === 0 && <p className="py-10 text-center text-gray-500">No templates match your search.</p>}
        </section>
      )}

      {tab === 'mine' && (
        <section aria-label="My templates">
          {custom.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d3d2ce] p-10 text-center">
              <p className="text-lg font-medium">You have no custom templates yet</p>
              <p className="mx-auto mt-1 max-w-md text-gray-600">Open any document page, then choose <strong>Save as template</strong> in its toolbar. Your templates stay private to you.</p>
            </div>
          ) : (
            <ul className={grid}>
              {mine.map((c) => (
                <li key={c.id} className={shell}>
                  <Link href={`/templates/my_${c.id}`} className="block" aria-label={`Open ${c.name}`}><Thumb cover={c.cover} doc={c.content} badge="My template" /></Link>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center gap-2"><span aria-hidden className="text-xl">{c.icon ?? '📄'}</span><h3 className="min-w-0 flex-1 truncate text-base font-semibold">{c.name}</h3></div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{c.description || 'Saved from one of your pages.'}</p>
                    <div className="mt-auto flex gap-2 pt-4">
                      <Link href={`/templates/my_${c.id}`} className="btn-secondary flex-1">Preview</Link>
                      <button type="button" className="btn flex-1" disabled={!!busy || !wid} onClick={() => useCustom(c)}>{busy === c.id ? 'Adding…' : 'Use template'}</button>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-sm"><button type="button" className="row-action" onClick={() => rename(c)}>Rename</button><button type="button" className="row-action-danger" onClick={() => remove(c)}>Delete</button></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {custom.length > 0 && mine.length === 0 && <p className="py-10 text-center text-gray-500">No templates match your search.</p>}
        </section>
      )}

      {tab === 'gallery' && cat === 'All' && !term && (
        <section aria-label="Start from scratch" className="grid gap-3 sm:grid-cols-2">
          {([['blank-doc', 'Blank page', 'Start from scratch.', 'Untitled', 'DOC'], ['blank-canvas', 'Blank canvas', 'An empty whiteboard.', 'Untitled canvas', 'CANVAS']] as const).map(([k, title, sub, name, kind]) => (
            <button key={k} type="button" disabled={!!busy || !wid} onClick={async () => {
              setBusy(k); setErr('');
              const r = await fetch(`/api/workspaces/${wid}/pages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: name, kind }) });
              const j = await r.json().catch(() => ({}));
              setBusy('');
              if (!r.ok) return setErr(j.error ?? 'Could not create the page');
              router.push(`/pages/${j.id}`); router.refresh();
            }} className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-[#d3d2ce] p-5 text-left transition-colors hover:bg-[#f7f6f3] disabled:opacity-60"><span className="font-medium">{title}</span><span className="text-sm text-gray-600">{sub}</span></button>
          ))}
        </section>
      )}
    </div>
  );
}
