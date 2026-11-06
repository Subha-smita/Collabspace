import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

// Landing route after login: honours the "Open on start" preference.
export default async function Start() {
  const u = await requireUser();
  const s = await getSettings(u.id);
  if (s.openOnStart === 'last') {
    const v = await prisma.pageVisit.findFirst({
      where: { userId: u.id, page: { OR: [{ workspace: { members: { some: { userId: u.id } } } }, { permissions: { some: { userId: u.id } } }] } },
      orderBy: { visitedAt: 'desc' },
      select: { pageId: true },
    });
    if (v) redirect(`/pages/${v.pageId}`);
  }
  redirect('/dashboard');
}
