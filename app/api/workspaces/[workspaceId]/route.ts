
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, parse } from '@/lib/api';

type Ctx = { params: { workspaceId: string } };
const S = z.object({ name: z.string().trim().min(1).max(80) });

export async function PATCH(req: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const d = await parse(req, S);
  if (!d) return fail('Name is required');
  const r = await prisma.workspace.updateMany({ where: { id: params.workspaceId, ownerId: u.id }, data: { name: d.name } });
  return r.count ? NextResponse.json({ ok: true }) : fail('Forbidden', 403);
}
export async function DELETE(_: Request, { params }: Ctx) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const r = await prisma.workspace.deleteMany({ where: { id: params.workspaceId, ownerId: u.id } });
  return r.count ? NextResponse.json({ ok: true }) : fail('Forbidden', 403);
}
