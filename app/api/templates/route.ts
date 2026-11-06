import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fail, gate, parse } from '@/lib/api';
import { updatesToJson } from '@/lib/docSchema';

const S = z.object({ pageId: z.string().min(1), name: z.string().trim().min(1).max(80), description: z.string().trim().max(300).optional() });
const MAX_PER_USER = 50;
const MAX_BYTES = 400_000;

/** Save an existing document page as a private custom template. */
export async function POST(req: Request) {
  const d = await parse(req, S);
  if (!d) return fail('A template name is required');
  const g = await gate(d.pageId, 'VIEW');
  if ('res' in g) return g.res;
  const page = await prisma.page.findUniqueOrThrow({ where: { id: d.pageId }, select: { kind: true, icon: true, cover: true } });
  if (page.kind !== 'DOC') return fail('Only document pages can be saved as templates');
  if ((await prisma.customTemplate.count({ where: { ownerId: g.user.id } })) >= MAX_PER_USER) return fail(`You can keep up to ${MAX_PER_USER} templates`);
  await new Promise((r) => setTimeout(r, 700)); // let the collab server's persistence batch flush
  const rows = await prisma.documentUpdate.findMany({ where: { pageId: d.pageId }, orderBy: { id: 'asc' }, select: { data: true } });
  const content = updatesToJson(rows.map((r) => r.data));
  if (!content.content?.length) return fail('This page is empty');
  if (JSON.stringify(content).length > MAX_BYTES) return fail('This page is too large to save as a template');
  // Uploaded covers are copied into the template itself so they survive deleting the source page; other covers are kept as references.
  const upId = page.cover?.startsWith('/api/uploads/') ? page.cover.slice('/api/uploads/'.length) : null;
  const up = upId ? await prisma.upload.findFirst({ where: { id: upId, pageId: d.pageId }, select: { data: true, mime: true } }) : null;
  const t = await prisma.customTemplate.create({ data: { ownerId: g.user.id, name: d.name, description: d.description ?? '', icon: page.icon, content: content as object, cover: upId ? null : page.cover } });
  if (up) await prisma.customTemplate.update({ where: { id: t.id }, data: { cover: `/api/templates/${t.id}/cover`, coverData: up.data, coverMime: up.mime } });
  return NextResponse.json({ id: t.id });
}
