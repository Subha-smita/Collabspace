import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ago } from '@/lib/time';
import NewPageButton from '@/components/NewPageButton';
import LocalTime from '@/components/LocalTime';
import { PageIcon } from '@/components/Icon';
import { getSettings } from '@/lib/settings';

const TABS = [
  { key: 'recents', label: 'Recents' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'shared', label: 'Shared' },
  { key: 'private', label: 'Private' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function Library({ searchParams }: { searchParams: { tab?: string } }) {
  const u = await requireUser();
  const absolute = (await getSettings(u.id)).dateFormat === 'absolute';
  const tab: Tab = TABS.some((t) => t.key === searchParams.tab) ? (searchParams.tab as Tab) : 'recents';

  const access = { OR: [{ workspace: { members: { some: { userId: u.id } } } }, { permissions: { some: { userId: u.id } } }] };
  // Private = nobody else is a workspace member and nobody else has a page permission.
  const priv = { workspace: { members: { none: { userId: { not: u.id } } } }, permissions: { none: { userId: { not: u.id } } } };

  const select = {
    id: true,
    title: true,
    kind: true,
    icon: true,
    createdBy: true,
    updatedAt: true,
    workspace: { select: { name: true, members: { where: { userId: { not: u.id } }, select: { id: true }, take: 1 } } },
    permissions: { where: { userId: { not: u.id } }, select: { id: true }, take: 1 },
    visits: { where: { userId: u.id }, select: { visitedAt: true } },
  } as const;

  let pages;
  if (tab === 'recents') {
    const v = await prisma.pageVisit.findMany({
      where: { userId: u.id, page: access },
      orderBy: { visitedAt: 'desc' },
      take: 50,
      select: { page: { select } },
    });
    pages = v.map((x) => x.page);
  } else {
    const where =
      tab === 'favorites' ? { AND: [access, { favorites: { some: { userId: u.id } } }] }
      : tab === 'private' ? { AND: [access, priv] }
      : { AND: [access, { NOT: priv }] };
    pages = await prisma.page.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 100, select });
  }

  const ids = [...new Set(pages.map((p) => p.createdBy))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const names = new Map(users.map((x) => [x.id, x.name]));
  const first = await prisma.workspace.findFirst({ where: { members: { some: { userId: u.id } } }, orderBy: { createdAt: 'asc' }, select: { id: true } });

  const th = 'px-3 py-2 text-left text-sm font-normal text-gray-500 whitespace-nowrap';
  const td = 'px-3 py-2 text-sm whitespace-nowrap';
  return (
    <main className="mx-auto max-w-5xl p-6 lg:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Library</h1>
        <div className="flex gap-2">
          <NewPageButton workspaceId={first?.id ?? null} />
        </div>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-[#e9e9e7]" aria-label="Library tabs">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/library?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`-mb-px rounded-t px-3 py-2 text-sm ${tab === t.key ? 'border-b-2 border-accent font-medium text-accent-dark' : 'text-gray-600 hover:bg-[#ebeae6]'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-[#e9e9e7]">
              <th className={th}>Page name</th>
              <th className={th}>Created by</th>
              <th className={th}>Source</th>
              <th className={th}>Last edited time</th>
              <th className={th}>Last visited time</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">Nothing here yet.</td></tr>
            )}
            {pages.map((p) => {
              const isPrivate = p.workspace.members.length === 0 && p.permissions.length === 0;
              return (
                <tr key={p.id} className="border-b border-[#e9e9e7] hover:bg-[#f7f6f3]">
                  <td className={`${td} font-medium`}>
                    <Link href={`/pages/${p.id}`} className="hover:underline"><span className="mr-2 inline-flex align-middle"><PageIcon icon={p.icon} kind={p.kind} /></span>{p.title || 'Untitled'}</Link>
                  </td>
                  <td className={td}>{names.get(p.createdBy) ?? 'Unknown'}</td>
                  <td className={td}>{isPrivate ? 'Private' : 'Shared'}</td>
                  <td className={td}>{absolute ? <LocalTime iso={p.updatedAt.toISOString()} /> : ago(p.updatedAt)}</td>
                  <td className={td}>{absolute ? <LocalTime iso={p.visits[0]?.visitedAt.toISOString() ?? null} /> : ago(p.visits[0]?.visitedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
