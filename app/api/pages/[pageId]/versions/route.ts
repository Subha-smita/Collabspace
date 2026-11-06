import { NextResponse } from 'next/server';
import * as Y from 'yjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, gate, parse } from '@/lib/api';

type Ctx = { params: { pageId: string } };

export async function GET(_: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'VIEW');
  if ('res' in g) return g.res;
  const list = await prisma.documentVersion.findMany({
    where: { pageId: params.pageId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, label: true, createdAt: true, createdBy: { select: { name: true } } },
  });
  return NextResponse.json(list);
}

// Snapshot is built server-side from persisted updates (never trusted from the client).
export async function POST(req: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'EDIT');
  if ('res' in g) return g.res;
  const d = await parse(req, z.object({ label: z.string().trim().max(100).optional() }));
  if (!d) return fail('Invalid body');
  await new Promise((r) => setTimeout(r, 700)); // let the collab server's 500ms persistence batch flush
  const rows = await prisma.documentUpdate.findMany({ where: { pageId: params.pageId }, orderBy: { id: 'asc' }, select: { data: true } });
  const doc = new Y.Doc();
  rows.forEach((r) => Y.applyUpdate(doc, r.data));
  const v = await prisma.documentVersion.create({
    data: { pageId: params.pageId, createdById: g.user.id, label: d.label || null, data: Buffer.from(Y.encodeStateAsUpdate(doc)) },
  });
  return NextResponse.json({ id: v.id });
}
