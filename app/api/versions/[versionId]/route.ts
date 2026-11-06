import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, gate } from '@/lib/api';

export async function GET(_: Request, { params }: { params: { versionId: string } }) {
  const v = await prisma.documentVersion.findUnique({ where: { id: params.versionId } });
  if (!v) return fail('Not found', 404);
  const g = await gate(v.pageId, 'VIEW');
  if ('res' in g) return g.res;
  return NextResponse.json({ id: v.id, createdAt: v.createdAt, data: Buffer.from(v.data).toString('base64') });
}
