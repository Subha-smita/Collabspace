import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail, limited } from '@/lib/api';

export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  if (limited(req, 'search', 60)) return fail('Too many requests', 429);
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!q) return NextResponse.json({ pages: [], tasks: [] });
  const [pages, tasks] = await Promise.all([
    prisma.page.findMany({
      where: {
        title: { contains: q, mode: 'insensitive' },
        OR: [{ workspace: { members: { some: { userId: u.id } } } }, { permissions: { some: { userId: u.id } } }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { id: true, title: true, workspace: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { title: { contains: q, mode: 'insensitive' }, workspace: { members: { some: { userId: u.id } } } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, title: true, status: true, workspaceId: true, workspace: { select: { name: true } } },
    }),
  ]);
  return NextResponse.json({ pages, tasks });
}