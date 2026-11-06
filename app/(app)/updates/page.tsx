import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UpdatesList from '@/components/UpdatesList';

export default async function Updates() {
  const u = await requireUser();
  const rows = await prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <UpdatesList
        items={rows.map((n) => ({
          id: n.id,
          message: n.message,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
          href: n.pageId ? `/pages/${n.pageId}` : n.workspaceId ? `/workspaces/${n.workspaceId}` : '/dashboard',
        }))}
      />
    </main>
  );
}