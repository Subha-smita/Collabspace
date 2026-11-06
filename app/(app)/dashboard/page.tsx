import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ago } from '@/lib/time';
import { ActionForm } from '@/components/Actions';
import Icon, { PageIcon } from '@/components/Icon';

export default async function Dashboard() {
  const u = await requireUser();
  const [workspaces, pages] = await Promise.all([
    prisma.workspace.findMany({
      where: { members: { some: { userId: u.id } } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { pages: true, members: true } } },
    }),
    prisma.page.findMany({
      where: { OR: [{ workspace: { members: { some: { userId: u.id } } } }, { permissions: { some: { userId: u.id } } }] },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: { workspace: { select: { name: true } } },
    }),
  ]);
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {u.name}</h1>
        <p className="mt-1 text-gray-600">Here’s what’s happening across your workspaces.</p>
      </div>

      <section aria-labelledby="ws-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="ws-h" className="text-lg font-semibold">Workspaces</h2>
          <ActionForm url="/api/workspaces" name="name" placeholder="New workspace name" button="Create workspace" gotoPrefix="/workspaces" />
        </div>
        {workspaces.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#d3d2ce] p-8 text-center text-gray-600">No workspaces yet. Create your first one above.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((w) => (
              <li key={w.id}>
                <Link href={`/workspaces/${w.id}`} className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-base font-semibold text-accent-dark">{w.name.trim()[0]?.toUpperCase() ?? '?'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{w.name}</span>
                    <span className="block text-sm text-gray-600">{w._count.pages} pages · {w._count.members} members</span>
                  </span>
                  {w.ownerId === u.id && <span className="badge">Owner</span>}
                  <Icon name="right" className="text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-h">
        <h2 id="recent-h" className="mb-3 text-lg font-semibold">Recent pages</h2>
        {pages.length === 0 ? (
          <p className="text-sm text-gray-600">Nothing here yet.</p>
        ) : (
          <ul className="card divide-y divide-[#e9e9e7] overflow-hidden">
            {pages.map((p) => (
              <li key={p.id}>
                <Link href={`/pages/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f6f3]">
                  <PageIcon icon={p.icon} kind={p.kind} />
                  <span className="min-w-0 flex-1 truncate">{p.title} <span className="text-sm text-gray-600">· {p.workspace.name}</span></span>
                  <span className="shrink-0 text-sm text-gray-600">{ago(p.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
