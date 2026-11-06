
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, gate, parse } from '@/lib/api';
import { COVER_RE } from '@/lib/covers';

type Ctx = { params: { pageId: string } };
const S = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    icon: z.string().trim().max(16).nullable().optional(),
    cover: z.string().regex(COVER_RE).nullable().optional(),
    fullWidth: z.boolean().optional(),
    smallText: z.boolean().optional(),
    hidePanel: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined));

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'EDIT');
  if ('res' in g) return g.res;
  const d = await parse(req, S);
  if (!d) return fail('Invalid page update');
  await prisma.page.update({ where: { id: params.pageId }, data: { title: d.title, icon: d.icon === '' ? null : d.icon, cover: d.cover, fullWidth: d.fullWidth, smallText: d.smallText, hidePanel: d.hidePanel } });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'EDIT', true);
  if ('res' in g) return g.res;
  await prisma.page.delete({ where: { id: params.pageId } });
  return NextResponse.json({ ok: true });
}
