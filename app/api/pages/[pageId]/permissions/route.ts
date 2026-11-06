
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, gate, parse } from '@/lib/api';
import { notify } from '@/lib/notify';

type Ctx = { params: { pageId: string } };
// `email` may hold several comma-separated addresses.
const S = z.object({ email: z.string().trim().min(3).max(1000), permission: z.enum(['VIEW', 'COMMENT', 'EDIT']) });
const Email = z.string().email();

export async function GET(_: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'VIEW', true);
  if ('res' in g) return g.res;
  const [page, rows] = await Promise.all([
    prisma.page.findUniqueOrThrow({ where: { id: params.pageId }, select: { workspace: { select: { owner: { select: { name: true, email: true } } } } } }),
    prisma.pagePermission.findMany({ where: { pageId: params.pageId }, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return NextResponse.json({
    owner: page.workspace.owner,
    entries: rows.map((r) => ({ userId: r.userId, name: r.user.name, email: r.user.email, permission: r.permission })),
  });
}
export async function PUT(req: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'VIEW', true);
  if ('res' in g) return g.res;
  const d = await parse(req, S);
  if (!d) return fail('Enter a valid email and permission');
  const emails = [...new Set(d.email.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  if (!emails.length || emails.some((e) => !Email.safeParse(e).success)) return fail('Enter valid email addresses, separated by commas');
  const [users, page, existing] = await Promise.all([
    prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } }),
    prisma.page.findUniqueOrThrow({ where: { id: params.pageId }, select: { title: true, workspaceId: true, workspace: { select: { ownerId: true } } } }),
    prisma.pagePermission.findMany({ where: { pageId: params.pageId }, select: { userId: true } }),
  ]);
  const missing = emails.filter((e) => !users.some((u) => u.email === e));
  const targets = users.filter((u) => u.id !== page.workspace.ownerId);
  if (!targets.length) return fail(missing.length ? `No registered user with: ${missing.join(', ')}` : 'Workspace owner always has full access', missing.length ? 404 : 400);
  await prisma.$transaction(targets.map((t) => prisma.pagePermission.upsert({
    where: { pageId_userId: { pageId: params.pageId, userId: t.id } },
    update: { permission: d.permission },
    create: { pageId: params.pageId, userId: t.id, permission: d.permission },
  })));
  const had = new Set(existing.map((e) => e.userId));
  await notify(targets.filter((t) => !had.has(t.id)).map((t) => ({
    userId: t.id, actorId: g.user.id, type: 'MEMBER_ADDED' as const,
    message: `${g.user.name} shared "${page.title}" with you`, pageId: params.pageId, workspaceId: page.workspaceId,
  }))).catch(() => {});
  return NextResponse.json({ ok: true, missing });
}
export async function DELETE(req: Request, { params }: Ctx) {
  const g = await gate(params.pageId, 'VIEW', true);
  if ('res' in g) return g.res;
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return fail('userId required');
  await prisma.pagePermission.deleteMany({ where: { pageId: params.pageId, userId } });
  return NextResponse.json({ ok: true });
}
