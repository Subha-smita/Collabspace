import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { getWsRole } from '@/lib/permissions';
import { TaskCreate, toDate } from '@/lib/tasks';
import { fail, parse } from '@/lib/api';

export async function POST(req: Request, { params }: { params: { workspaceId: string } }) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const role = await getWsRole(u.id, params.workspaceId);
  if (!role) return fail('Forbidden', 403);
  if (role === 'VIEWER') return fail('Viewers cannot create tasks', 403);
  const d = await parse(req, TaskCreate);
  if (!d) return fail('A task title is required');
  if (d.assigneeId && !(await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: params.workspaceId, userId: d.assigneeId } }, select: { id: true } })))
    return fail('Assignee must be a workspace member');
  const t = await prisma.task.create({
    data: { workspaceId: params.workspaceId, title: d.title, status: d.status, priority: d.priority, dueDate: toDate(d.dueDate), assigneeId: d.assigneeId ?? null, createdById: u.id },
  });
  return NextResponse.json({ id: t.id });
}