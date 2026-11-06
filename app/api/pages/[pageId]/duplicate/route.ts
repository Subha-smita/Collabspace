import { NextResponse } from 'next/server';
import * as Y from 'yjs';
import { prisma } from '@/lib/prisma';
import { getWsRole } from '@/lib/permissions';
import { fail, gate } from '@/lib/api';

export async function POST(_: Request, { params }: { params: { pageId: string } }) {
  const g = await gate(params.pageId, 'VIEW');
  if ('res' in g) return g.res;
const src = await prisma.page.findUniqueOrThrow({ where: { id: params.pageId }, select: { title: true, kind: true, icon: true, cover: true, fullWidth: true, smallText: true, hidePanel: true, workspaceId: true, parentId: true } });
  const role = await getWsRole(g.user.id, src.workspaceId);
  if (!role || role === 'VIEWER') return fail('You cannot create pages in this workspace', 403);
  await new Promise((r) => setTimeout(r, 700)); // let the collab server's persistence batch flush
  const rows = await prisma.documentUpdate.findMany({ where: { pageId: params.pageId }, orderBy: { id: 'asc' }, select: { data: true } });
  const doc = new Y.Doc();
  rows.forEach((r) => Y.applyUpdate(doc, r.data));
    const page = await prisma.page.create({
    data: {
      workspaceId: src.workspaceId,
      parentId: src.parentId,
      kind: src.kind,
      icon: src.icon,
      cover: src.cover?.startsWith('/api/uploads/') ? null : src.cover,
      fullWidth: src.fullWidth,
      smallText: src.smallText,
      hidePanel: src.hidePanel,
      title: `${src.title} (copy)`.slice(0, 120),
      createdBy: g.user.id,
      updates: { create: { data: Buffer.from(Y.encodeStateAsUpdate(doc)) } },
    },
  });
  // Give the copy its own copy of an uploaded cover.
  const upId = src.cover?.startsWith('/api/uploads/') ? src.cover.slice('/api/uploads/'.length) : null;
  const up = upId ? await prisma.upload.findFirst({ where: { id: upId, pageId: params.pageId }, select: { data: true, mime: true, size: true } }) : null;
  if (up) {
    const n = await prisma.upload.create({ data: { pageId: page.id, userId: g.user.id, mime: up.mime, size: up.size, data: up.data }, select: { id: true } });
    await prisma.page.update({ where: { id: page.id }, data: { cover: `/api/uploads/${n.id}` } });
  } else if (src.cover?.startsWith('/api/uploads/')) await prisma.page.update({ where: { id: page.id }, data: { cover: src.cover } });
  return NextResponse.json({ id: page.id });
}