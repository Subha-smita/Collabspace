import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { getSettings } from '@/lib/settings';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  const access = { OR: [{ workspace: { members: { some: { userId: u.id } } } }, { permissions: { some: { userId: u.id } } }] };
  const [workspaces, shared, favorites, unread, recents, settings] = await Promise.all([
    prisma.workspace.findMany({
      where: { members: { some: { userId: u.id } } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, pages: { orderBy: { createdAt: 'asc' }, take: 200, select: { id: true, title: true, parentId: true, kind: true, icon: true } } },
    }),
    prisma.page.findMany({
      where: { permissions: { some: { userId: u.id } }, workspace: { members: { none: { userId: u.id } } } },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: { id: true, title: true, parentId: true, kind: true, icon: true },
    }),
    prisma.favorite.findMany({
      where: { userId: u.id, page: access },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { page: { select: { id: true, title: true, kind: true, icon: true } } },
    }),
    prisma.notification.count({ where: { userId: u.id, read: false } }),
    prisma.pageVisit.findMany({
      where: { userId: u.id, page: access },
      orderBy: { visitedAt: 'desc' },
      take: 6,
      select: { page: { select: { id: true, title: true, kind: true, icon: true } } },
    }),
    getSettings(u.id),
  ]);
  return (
    <div className={settings.highContrast ? 'hc' : undefined}>
      <Header name={u.name} email={u.email} />
      <div className="lg:flex">
        <Sidebar workspaces={workspaces} shared={shared} favorites={favorites.map((f) => f.page)} recents={recents.map((r) => r.page)} hidden={settings.sidebarHidden} unread={unread} userName={u.name} userEmail={u.email} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}