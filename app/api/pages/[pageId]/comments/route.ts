import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPerm } from '@/lib/permissions';
import { notify } from '@/lib/notify';
import { fail, gate, limited, parse } from '@/lib/api';

type Ctx = { params: { pageId: string } };
const S = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().optional(),
  mentions: z.array(z.string().min(1)).max(10).optional(),
});
const who = { select: { id: true, name: true } };

export async function GET(_: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'VIEW');
  if ('res' in g) return g.res;
  const list = await prisma.comment.findMany({
    where: { pageId: params.pageId, parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: { user: who, replies: { orderBy: { createdAt: 'asc' }, include: { user: who } } },
  });
  return NextResponse.json(list);
}
export async function POST(req: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'COMMENT');
  if ('res' in g) return g.res;
  if (limited(req, 'comment', 30)) return fail('Too many requests', 429);
  const d = await parse(req, S);
  if (!d) return fail('Comment cannot be empty');
  if (d.parentId && !(await prisma.comment.findFirst({ where: { id: d.parentId, pageId: params.pageId, parentId: null } }))) return fail('Invalid parent', 404);
  const c = await prisma.comment.create({ data: { pageId: params.pageId, userId: g.user.id, content: d.content, parentId: d.parentId } });

  // Notifications must never break posting a comment.
  try {
    const page = await prisma.page.findUnique({ where: { id: params.pageId }, select: { title: true } });
    const title = page?.title ?? 'a page';
    const targets = new Map<string, 'MENTION' | 'REPLY'>();
    if (d.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: d.parentId }, select: { userId: true } });
      if (parent && (await getPerm(parent.userId, params.pageId))) targets.set(parent.userId, 'REPLY');
    }
    if (d.mentions?.length) {
      const users = await prisma.user.findMany({ where: { id: { in: d.mentions } }, select: { id: true, name: true } });
      for (const m of users) {
        if (!d.content.includes(`@${m.name}`)) continue; // mention text was edited away
        if (await getPerm(m.id, params.pageId)) targets.set(m.id, 'MENTION');
      }
    }
    await notify(
      [...targets].map(([userId, type]) => ({
        userId,
        actorId: g.user.id,
        type,
        pageId: params.pageId,
        message: type === 'MENTION' ? `${g.user.name} mentioned you in "${title}"` : `${g.user.name} replied to your comment on "${title}"`,
      })),
    );
  } catch (e) {
    console.error('notify failed', e);
  }
  return NextResponse.json({ id: c.id });
}