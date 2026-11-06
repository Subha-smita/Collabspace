import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { getWsRole } from '@/lib/permissions';
import { TaskUpdate, toDate } from '@/lib/tasks';
import { fail, parse } from '@/lib/api';

type Ctx = { params: { taskId: string } };
const load = (id: string) => prisma.task.findUnique({ where: { id }, select: { id: true, workspaceId: true, createdById: true } });

export async function PATCH(req: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const t = await load(params.taskId);
  const role = t ? await getWsRole(u.id, t.workspaceId) : null;
  if (!t || !role) return fail('Not found', 404);
  if (role === 'VIEWER') return fail('Viewers cannot edit tasks', 403);
  const d = await parse(req, TaskUpdate);
  if (!d) return fail('Invalid task');
  if (d.assigneeId && !(await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: t.workspaceId, userId: d.assigneeId } }, select: { id: true } })))
    return fail('Assignee must be a workspace member');
  await prisma.task.update({
    where: { id: t.id },
    data: { title: d.title, status: d.status, priority: d.priority, dueDate: toDate(d.dueDate), assigneeId: d.assigneeId },
  });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const t = await load(params.taskId);
  const role = t ? await getWsRole(u.id, t.workspaceId) : null;
  if (!t || !role) return fail('Not found', 404);
  const allowed = role === 'OWNER' || role === 'ADMIN' || (role !== 'VIEWER' && t.createdById === u.id);
  if (!allowed) return fail('Forbidden', 403);
  await prisma.task.delete({ where: { id: t.id } });
  return NextResponse.json({ ok: true });
}