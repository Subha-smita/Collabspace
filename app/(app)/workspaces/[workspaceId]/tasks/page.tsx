import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TaskBoard from '@/components/TaskBoard';
import TaskList from '@/components/TaskList';
import Breadcrumb from '@/components/Breadcrumb';

export default async function Tasks({ params, searchParams }: { params: { workspaceId: string }; searchParams: { view?: string } }) {
  const u = await requireUser();
  const w = await prisma.workspace.findFirst({
    where: { id: params.workspaceId, members: { some: { userId: u.id } } },
    select: {
      id: true,
      name: true,
      ownerId: true,
      members: { select: { role: true, user: { select: { id: true, name: true } } }, orderBy: { joinedAt: 'asc' } },
      tasks: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!w) notFound();
  const view = searchParams.view === 'board' ? 'board' : 'list';
  const role = w.ownerId === u.id ? 'OWNER' : (w.members.find((m) => m.user.id === u.id)?.role ?? 'VIEWER');
  const props = {
    workspaceId: w.id,
    userId: u.id,
    canWrite: role !== 'VIEWER',
    isAdmin: role === 'OWNER' || role === 'ADMIN',
    members: w.members.map((m) => m.user),
    tasks: w.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      assigneeId: t.assigneeId,
      createdById: t.createdById,
    })),
  };
  return (
    <main className={`mx-auto space-y-4 p-6 lg:p-10 ${view === 'board' ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <div className="space-y-3">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: w.name, href: `/workspaces/${w.id}` }, { label: 'Tasks' }]} />
        <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
        <p className="text-sm text-gray-600">Stay organized with tasks, your way.</p>
      </div>
      <nav className="flex gap-1 text-sm" aria-label="Task views">
        {(['list', 'board'] as const).map((v) => (
          <Link key={v} href={`/workspaces/${w.id}/tasks?view=${v}`} className={`rounded-md px-3 py-1 capitalize ${view === v ? 'bg-[#ebeae6] font-medium' : 'text-gray-600 hover:bg-[#f1f0ee]'}`}>{v}</Link>
        ))}
      </nav>
      {view === 'board' ? <TaskBoard {...props} /> : <TaskList {...props} />}
    </main>
  );
}
