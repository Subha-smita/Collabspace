import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { getWsRole } from '@/lib/permissions';
import { notify } from '@/lib/notify';
import { fail, parse } from '@/lib/api';

type Ctx = { params: { workspaceId: string } };
const roleEnum = z.enum(['ADMIN', 'MEMBER', 'VIEWER']);
const Add = z.object({ email: z.string().trim().toLowerCase().email(), role: roleEnum.default('MEMBER') });
const Change = z.object({ userId: z.string().min(1), role: roleEnum });

async function actor(workspaceId: string) {
  const u = await getUser();
  if (!u) return { res: fail('Unauthorized', 401) };
  const role = await getWsRole(u.id, workspaceId);
  if (role !== 'OWNER' && role !== 'ADMIN') return { res: fail('Forbidden', 403) };
  return { u, role };
}
const member = (workspaceId: string, userId: string) =>
  prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });

// Owner/Admin adds an already-registered user by email. Existing members keep their role.
export async function POST(req: Request, { params }: Ctx) {
  const a = await actor(params.workspaceId);
  if ('res' in a) return a.res;
  const d = await parse(req, Add);
  if (!d) return fail('Enter a valid email');
  if (d.role === 'ADMIN' && a.role !== 'OWNER') return fail('Only the owner can add admins', 403);
  const target = await prisma.user.findUnique({ where: { email: d.email } });
  if (!target) return fail('No registered user with that email', 404);
  const existing = await member(params.workspaceId, target.id);
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: params.workspaceId, userId: target.id } },
    update: {},
    create: { workspaceId: params.workspaceId, userId: target.id, role: d.role },
  });
  if (!existing) {
    const ws = await prisma.workspace.findUnique({ where: { id: params.workspaceId }, select: { name: true } });
    await notify([{ userId: target.id, actorId: a.u.id, type: 'MEMBER_ADDED', workspaceId: params.workspaceId, message: `${a.u.name} added you to the workspace "${ws?.name ?? ''}"` }]).catch(console.error);
  }
  return NextResponse.json({ ok: true });
}
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await actor(params.workspaceId);
  if ('res' in a) return a.res;
  const d = await parse(req, Change);
  if (!d) return fail('Invalid body');
  const t = await member(params.workspaceId, d.userId);
  if (!t || t.role === 'OWNER') return fail('Invalid member');
  if (a.role !== 'OWNER' && (t.role === 'ADMIN' || d.role === 'ADMIN')) return fail('Only the owner can manage admins', 403);
  await prisma.workspaceMember.update({ where: { id: t.id }, data: { role: d.role } });
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request, { params }: Ctx) {
  const a = await actor(params.workspaceId);
  if ('res' in a) return a.res;
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId || userId === a.u.id) return fail('Invalid member');
  const t = await member(params.workspaceId, userId);
  if (!t || t.role === 'OWNER') return fail('Invalid member');
  if (a.role !== 'OWNER' && t.role === 'ADMIN') return fail('Only the owner can remove admins', 403);
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: params.workspaceId, userId } });
  await prisma.pagePermission.deleteMany({ where: { userId, page: { workspaceId: params.workspaceId } } });
  return NextResponse.json({ ok: true });
}