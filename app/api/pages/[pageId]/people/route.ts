import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gate } from '@/lib/api';

export async function GET(_: Request, { params }: { params: { pageId: string } }) {
  const g = await gate(params.pageId, 'VIEW');
  if ('res' in g) return g.res;
  const who = { select: { id: true, name: true } };
  const p = await prisma.page.findUniqueOrThrow({
    where: { id: params.pageId },
    select: {
      permissions: { select: { user: who } },
      workspace: { select: { owner: who, members: { select: { user: who } } } },
    },
  });
  const map = new Map<string, { id: string; name: string }>();
  [p.workspace.owner, ...p.workspace.members.map((m) => m.user), ...p.permissions.map((x) => x.user)].forEach((u) => map.set(u.id, u));
  return NextResponse.json([...map.values()]);
}