import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TEMPLATES, getTemplate, type N, type ShapeSeed } from '@/lib/templates';
import { features, outline } from '@/lib/templateInfo';
import TemplateActions from '@/components/TemplateActions';
import TemplatePreview from '@/components/TemplatePreview';
import { templateCoverUrl } from '@/lib/templateCover';
import { coverStyle, isPreset } from '@/lib/covers';

const COVER: Record<string, [string, string]> = {
  Student: ['#fde7ef', '#f8c8d8'], Finance: ['#dcefe0', '#b9dcc2'], Productivity: ['#fdf0cf', '#f6dc9b'], Work: ['#dfeaf6', '#bcd3ee'],
  Planning: ['#e9e2f6', '#d2c5ec'], Personal: ['#fbe5da', '#f4c9b3'], Canvas: ['#e3f1ee', '#bfe0d9'],
};

type View = { name: string; desc: string; icon: string | null; kind: 'DOC' | 'CANVAS'; category: string; creator: string; tplRef: string; canvasKey?: string; doc?: N; shapes?: ShapeSeed[]; uses: number; cover: [string, string]; coverUrl: string | null };

export default async function TemplateDetail({ params }: { params: { key: string } }) {
  const u = await requireUser();
  const workspaces = await prisma.workspace.findMany({ where: { members: { some: { userId: u.id } } }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });

  let v: View;
  if (params.key.startsWith('my_')) {
    const c = await prisma.customTemplate.findFirst({ where: { id: params.key.slice(3), ownerId: u.id } });
    if (!c) notFound();
    v = { name: c.name, desc: c.description || 'A template you saved from one of your pages.', icon: c.icon, kind: 'DOC', category: 'My templates', creator: 'You', tplRef: `custom:${c.id}`, doc: c.content as unknown as N, uses: c.uses, cover: ['#e9e2f6', '#d2c5ec'], coverUrl: c.cover };
  } else {
    const t = getTemplate(params.key);
    if (!t) notFound();
    const stat = await prisma.templateStat.findUnique({ where: { key: t.key } });
    v = { name: t.name, desc: t.desc, icon: t.icon, kind: t.kind, category: t.category, creator: 'CollabSpace', tplRef: `builtin:${t.key}`, canvasKey: t.kind === 'CANVAS' ? t.key : undefined, doc: t.doc, shapes: t.shapes, uses: stat?.uses ?? 0, cover: t.cover ?? COVER[t.category] ?? ['#ebeae6', '#dcdbd7'], coverUrl: templateCoverUrl(t.key) };
  }
  const feats = features(v.doc, v.shapes);
  const inside = outline(v.doc);
  const related = TEMPLATES.filter((t) => t.category === v.category && t.key !== params.key).slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl space-y-12 p-6 lg:p-10">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-600"><Link href="/templates" className="hover:underline">Templates</Link> <span aria-hidden>/</span> <span className="text-[#37352f]">{v.name}</span></nav>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          <p className="flex items-center gap-2 text-sm text-gray-600"><span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ebeae6]">{v.icon ?? '📄'}</span>{v.creator}</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">{v.name}</h1>
          <p className="text-lg leading-relaxed text-gray-700">{v.desc}</p>
          <TemplateActions cover={v.coverUrl} category={v.category} desc={v.desc} tplRef={v.tplRef} name={v.name} kind={v.kind} icon={v.icon} canvasKey={v.canvasKey} workspaces={workspaces} doc={v.doc} shapes={v.shapes} />
          <div>
            <h2 className="mb-2 text-sm text-gray-500">Features</h2>
            <ul className="space-y-2">{feats.map((f) => <li key={f.label} className="flex items-center gap-3 text-[15px]"><span aria-hidden className="w-6 text-center text-lg">{f.icon}</span>{f.label}</li>)}</ul>
          </div>
        </div>

        <div className="relative h-[34rem] overflow-hidden rounded-2xl border border-[#e9e9e7]" style={{ background: `linear-gradient(135deg, ${v.cover[0]}, ${v.cover[1]})` }} aria-label="Template preview">
          {v.coverUrl && (isPreset(v.coverUrl) ? <div className="absolute inset-x-0 top-0 h-32" style={coverStyle(v.coverUrl)} /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={v.coverUrl} alt="" className="absolute inset-x-0 top-0 h-32 w-full object-cover" />)}
          <div className="absolute inset-x-8 bottom-0 top-24 overflow-hidden rounded-t-xl bg-white p-8 shadow-md">
            <div className="text-4xl leading-none" aria-hidden>{v.icon}</div>
            <h2 className="mb-3 mt-3 text-2xl font-bold">{v.name}</h2>
            <TemplatePreview doc={v.doc} shapes={v.shapes} />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
          </div>
        </div>
      </section>

      <section aria-label="Template details" className="grid grid-cols-2 gap-6 border-y border-[#e9e9e7] py-6 text-center sm:grid-cols-4">
        {([['Category', v.category], ['Type', v.kind === 'CANVAS' ? 'Canvas' : 'Page'], ['Times used', String(v.uses)], ['Price', 'Free']] as const).map(([k, val]) => (
          <div key={k}><div className="text-xl font-medium text-[#37352f]">{val}</div><div className="text-sm text-gray-500">{k}</div></div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <h2 className="text-3xl font-bold">About</h2>
        <div className="space-y-4 text-[17px] leading-relaxed text-gray-700">
          <p>{v.desc} Adding it creates a new page in your workspace with its own copy of the content, so editing your page never changes the template or anyone else&rsquo;s pages.</p>
          {inside.length > 0 && (<><p className="font-medium text-[#37352f]">What&rsquo;s inside</p><ul className="list-disc space-y-1 pl-6">{inside.map((s) => <li key={s}>{s}</li>)}</ul></>)}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-label="More templates">
          <h2 className="mb-4 text-xl font-semibold">More in {v.category}</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {related.map((t) => (
              <li key={t.key}><Link href={`/templates/${t.key}`} className="flex items-center gap-3 rounded-xl border border-[#e9e9e7] p-4 transition-colors hover:bg-[#f7f6f3]"><span aria-hidden className="text-2xl">{t.icon}</span><span className="min-w-0"><span className="block truncate font-medium">{t.name}</span><span className="block truncate text-sm text-gray-600">{t.desc}</span></span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
