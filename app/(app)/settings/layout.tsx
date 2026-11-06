import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SettingsNav from '@/components/SettingsNav';

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: u.id } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  return (
    <main className="mx-auto grid max-w-5xl gap-8 p-6 md:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:p-10">
      <div className="md:sticky md:top-6 md:self-start">
        <h1 className="mb-3 px-3 text-lg font-semibold">Settings</h1>
        <SettingsNav workspaces={workspaces} />
      </div>
      <div className="min-w-0 max-w-2xl">{children}</div>
    </main>
  );
}
