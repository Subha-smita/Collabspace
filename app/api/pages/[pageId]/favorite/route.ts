import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, gate, parse } from '@/lib/api';

export async function PUT(req: Request, { params }: { params: { pageId: string } }) {
  const g = await gate(params.pageId, 'VIEW');
  if ('res' in g) return g.res;
  const d = await parse(req, z.object({ favorite: z.boolean() }));
  if (!d) return fail('Invalid body');
  const key = { userId: g.user.id, pageId: params.pageId };
  if (d.favorite) await prisma.favorite.upsert({ where: { userId_pageId: key }, update: {}, create: key });
  else await prisma.favorite.deleteMany({ where: key });
  return NextResponse.json({ ok: true });
}