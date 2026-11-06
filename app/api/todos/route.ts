
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, parse } from '@/lib/api';
import { MAX_TODOS, TodoCreate, ensureSeeded, listTodos, toDTO, toDay } from '@/lib/todos';

export async function GET() {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  await ensureSeeded(u.id);
  return NextResponse.json({ todos: await listTodos(u.id) });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const body = TodoCreate.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? 'Invalid task');
  const d = body.data;
  if ((await prisma.todo.count({ where: { userId: u.id } })) >= MAX_TODOS) return fail(`You can keep up to ${MAX_TODOS} tasks`);
  const last = await prisma.todo.aggregate({ where: { userId: u.id }, _max: { sortOrder: true } });
  const t = await prisma.todo.create({ data: { userId: u.id, title: d.title, description: d.description ?? '', dueDate: toDay(d.dueDate) ?? null, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  return NextResponse.json({ todo: toDTO(t) }, { status: 201 });
}
