import type { Role } from '@prisma/client';
import { prisma } from './prisma';
export type Perm = 'VIEW' | 'COMMENT' | 'EDIT';
export const rank: Record<Perm, number> = { VIEW: 1, COMMENT: 2, EDIT: 3 };

export async function getWsRole(userId: string, workspaceId: string): Promise<Role | null> {
  const w = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!w) return null;
  if (w.ownerId === userId) return 'OWNER';
  const m = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } }, select: { role: true } });
  return m ? m.role : null;
}

const best = (a: Perm | null, b: Perm | null): Perm | null => (!a ? b : !b ? a : rank[a] >= rank[b] ? a : b);

/** Effective page permission. Owner = EDIT; explicit PagePermission overrides the workspace default (viewer = VIEW, others EDIT); "anyone with the link" (signed-in users) can only raise it. */
export async function getPerm(userId: string, pageId: string): Promise<Perm | null> {
  const page = await prisma.page.findUnique({ where: { id: pageId }, select: { workspaceId: true, linkAccess: true, linkPermission: true, workspace: { select: { ownerId: true } } } });
  if (!page) return null;
  if (page.workspace.ownerId === userId) return 'EDIT';
  const pp = await prisma.pagePermission.findUnique({ where: { pageId_userId: { pageId, userId } } });
  let base: Perm | null = pp ? pp.permission : null;
  if (!pp) {
    const m = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: page.workspaceId, userId } }, select: { role: true } });
    if (m) base = m.role === 'VIEWER' ? 'VIEW' : 'EDIT';
  }
  return page.linkAccess === 'ANYONE' ? best(base, page.linkPermission) : base;
}
export async function canManage(userId: string, pageId: string) {
  const p = await prisma.page.findUnique({ where: { id: pageId }, select: { createdBy: true, workspaceId: true, workspace: { select: { ownerId: true } } } });
  if (!p) return false;
  if (p.createdBy === userId || p.workspace.ownerId === userId) return true;
  return (await getWsRole(userId, p.workspaceId)) === 'ADMIN';
}