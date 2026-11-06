
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TemplateGallery from '@/components/TemplateGallery';

export default async function Templates({ searchParams }: { searchParams: { tab?: string } }) {
  const u = await requireUser();
  const [workspaces, custom, stats] = await Promise.all([
    prisma.workspace.findMany({ where: { members: { some: { userId: u.id } } }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } }),
    prisma.customTemplate.findMany({ where: { ownerId: u.id }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, description: true, icon: true, uses: true, cover: true, content: true } }),
    prisma.templateStat.findMany(),
  ]);
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="mt-1 text-gray-600">Start faster with a ready-made page or canvas. Every template becomes your own editable copy.</p>
      </div>
      <TemplateGallery workspaces={workspaces} custom={custom.map((c) => ({ ...c, content: { type: 'doc', content: ((c.content as { content?: unknown[] } | null)?.content ?? []).slice(0, 10) } as never }))} stats={Object.fromEntries(stats.map((s: { key: string; uses: number }) => [s.key, s.uses]))} initialTab={searchParams.tab === 'mine' ? 'mine' : 'gallery'} />
    </main>
  );
}
