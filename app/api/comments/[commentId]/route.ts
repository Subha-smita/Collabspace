import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { canManage } from '@/lib/permissions';
import { fail, gate, parse } from '@/lib/api';

type Ctx = { params: { commentId: string } };
const find = (id: string) => prisma.comment.findUnique({ where: { id } });

export async function PATCH(req: Request, { params }: Ctx) {
  const c = await find(params.commentId);
  if (!c) return fail('Not found', 404);
  const g = await gate(c.pageId, 'COMMENT');
  if ('res' in g) return g.res;
  const d = await parse(req, z.object({ resolved: z.boolean() }));
  if (!d) return fail('Invalid body');
  await prisma.comment.update({ where: { id: c.id }, data: { resolved: d.resolved } });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const c = await find(params.commentId);
  if (!c) return fail('Not found', 404);
  const g = await gate(c.pageId, 'COMMENT');
  if ('res' in g) return g.res;
  if (c.userId !== g.user.id && !(await canManage(g.user.id, c.pageId))) return fail('Forbidden', 403);
  await prisma.comment.delete({ where: { id: c.id } });
  return NextResponse.json({ ok: true });
}
