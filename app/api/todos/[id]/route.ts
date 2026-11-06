import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/api';
import { TodoUpdate, toDTO, toDay } from '@/lib/todos';

type Ctx = { params: { id: string } };

// Every query is scoped by userId, so another user's task id behaves exactly like a missing one (404).
export async function PATCH(req: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const body = TodoUpdate.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? 'Invalid task');
  const d = body.data;
  const r = await prisma.todo.updateMany({
    where: { id: params.id, userId: u.id },
    data: { title: d.title, description: d.description, dueDate: toDay(d.dueDate), done: d.done, doneAt: d.done === undefined ? undefined : d.done ? new Date() : null },
  });
  if (r.count === 0) return fail('Task not found', 404);
  const t = await prisma.todo.findFirst({ where: { id: params.id, userId: u.id } });
  return NextResponse.json({ todo: t ? toDTO(t) : null });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const r = await prisma.todo.deleteMany({ where: { id: params.id, userId: u.id } });
  if (r.count === 0) return fail('Task not found', 404);
  return NextResponse.json({ ok: true });
}
