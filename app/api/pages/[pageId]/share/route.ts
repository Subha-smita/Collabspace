import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, gate, parse } from '@/lib/api';

type Ctx = { params: { pageId: string } };
const S = z
  .object({
    linkAccess: z.enum(['RESTRICTED', 'ANYONE']).optional(),
    linkPermission: z.enum(['VIEW', 'COMMENT', 'EDIT']).optional(),
    published: z.boolean().optional(),
    publishIndex: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined));
const SEL = { linkAccess: true, linkPermission: true, published: true, publishedAt: true, publishIndex: true, kind: true } as const;

export async function GET(_: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'VIEW', true);
  if ('res' in g) return g.res;
  return NextResponse.json(await prisma.page.findUniqueOrThrow({ where: { id: params.pageId }, select: SEL }));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'VIEW', true);
  if ('res' in g) return g.res;
  const d = await parse(req, S);
  if (!d) return fail('Invalid share settings');
  const cur = await prisma.page.findUniqueOrThrow({ where: { id: params.pageId }, select: { kind: true, published: true } });
  if (d.published && cur.kind === 'CANVAS') return fail('Canvas pages cannot be published yet');
  const page = await prisma.page.update({
    where: { id: params.pageId },
    data: {
      ...d,
      publishedAt: d.published === undefined || d.published === cur.published ? undefined : d.published ? new Date() : null,
    },
    select: SEL,
  });
  return NextResponse.json(page);
}
