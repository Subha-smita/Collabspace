
import type { JSONContent } from '@tiptap/core';
import { prisma } from './prisma';
import { updatesToJson } from './docSchema';

/** Rebuilds a page's saved Yjs document as ProseMirror JSON (server-side, read-only). */
export async function loadDocJson(pageId: string): Promise<JSONContent> {
  const rows = await prisma.documentUpdate.findMany({ where: { pageId }, orderBy: { id: 'asc' }, select: { data: true } });
  return updatesToJson(rows.map((r) => r.data));
}
