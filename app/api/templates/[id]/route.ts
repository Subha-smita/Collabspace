import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, parse } from '@/lib/api';

const S = z.object({ name: z.string().trim().min(1).max(80).optional(), description: z.string().trim().max(300).optional() }).refine((v) => v.name !== undefined || v.description !== undefined);
type Ctx = { params: { id: string } };

async function mine(id: string) {
  const u = await getUser();
  if (!u) return { res: fail('Unauthorized', 401) } as const;
  const t = await prisma.customTemplate.findFirst({ where: { id, ownerId: u.id }, select: { id: true } });
  return t ? ({ ok: true } as const) : ({ res: fail('Template not found', 404) } as const);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const m = await mine(params.id);
  if ('res' in m) return m.res;
  const d = await parse(req, S);
  if (!d) return fail('Invalid template details');
  await prisma.customTemplate.update({ where: { id: params.id }, data: d });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const m = await mine(params.id);
  if ('res' in m) return m.res;
  await prisma.customTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}