import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { getWsRole } from '@/lib/permissions';
import { fail, parse } from '@/lib/api';
import { getTemplate, type N } from '@/lib/templates';
import { jsonToUpdate } from '@/lib/docSchema';

// `template` is "builtin:<key>" or "custom:<id>". Each call creates a brand-new, independent page.
const S = z.object({
  title: z.string().trim().min(1).max(120),
  parentId: z.string().min(1).optional(),
  kind: z.enum(['DOC', 'CANVAS']).optional(),
  icon: z.string().trim().max(16).optional(),
  template: z.string().max(80).optional(),
});

export async function POST(req: Request, { params }: { params: { workspaceId: string } }) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const role = await getWsRole(u.id, params.workspaceId);
  if (!role) return fail('Forbidden', 403);
  if (role === 'VIEWER') return fail('Viewers cannot create pages', 403);
  const d = await parse(req, S);
  if (!d) return fail('Title is required');
  if (d.parentId && !(await prisma.page.findFirst({ where: { id: d.parentId, workspaceId: params.workspaceId }, select: { id: true } }))) return fail('Invalid parent page', 404);

  let kind = d.kind ?? 'DOC';
  let icon = d.icon;
  let initial: Uint8Array | null = null;
  let cover: string | undefined;
  let coverBlob: { data: Buffer | Uint8Array; mime: string } | null = null;
  let builtinKey: string | null = null;
  let customId: string | null = null;

  if (d.template?.startsWith('custom:')) {
    const c = await prisma.customTemplate.findFirst({ where: { id: d.template.slice(7), ownerId: u.id } });
    if (!c) return fail('Template not found', 404);
    kind = 'DOC';
    icon = icon ?? c.icon ?? undefined;
    customId = c.id;
    if (c.cover && c.coverData && c.coverMime) coverBlob = { data: c.coverData, mime: c.coverMime };
    else if (c.cover && !c.cover.startsWith('/api/templates/')) cover = c.cover;
    try { initial = jsonToUpdate(c.content as never); } catch { return fail('This template could not be read', 422); }
  } else if (d.template?.startsWith('builtin:')) {
    const t = getTemplate(d.template.slice(8));
    if (!t) return fail('Template not found', 404);
    kind = t.kind;
    icon = icon ?? t.icon;
    builtinKey = t.key;
    cover = `/api/template-cover/${t.key}`;
    if (t.kind === 'DOC' && t.doc) { try { initial = jsonToUpdate(t.doc as never); } catch { initial = null; } }
  }

  const p = await prisma.page.create({
    data: {
      workspaceId: params.workspaceId, title: d.title, createdBy: u.id, parentId: d.parentId, kind, icon, cover,
      ...(initial ? { updates: { create: { data: Buffer.from(initial) } } } : {}),
    },
  });
  // A stored template cover is copied into an upload owned by the new page, so the two never share (or lose) the file.
  if (coverBlob) {
    const up = await prisma.upload.create({ data: { pageId: p.id, userId: u.id, mime: coverBlob.mime, size: coverBlob.data.length, data: Buffer.from(coverBlob.data) }, select: { id: true } });
    await prisma.page.update({ where: { id: p.id }, data: { cover: `/api/uploads/${up.id}` } });
  }
  // Usage counters power the "Popular" section; failures here must never block page creation.
  if (builtinKey) await prisma.templateStat.upsert({ where: { key: builtinKey }, update: { uses: { increment: 1 } }, create: { key: builtinKey, uses: 1 } }).catch(() => {});
  if (customId) await prisma.customTemplate.update({ where: { id: customId }, data: { uses: { increment: 1 } } }).catch(() => {});
  // seeded=false for canvas templates (the canvas applies ?template=<key> itself) or if a doc could not be seeded.
  return NextResponse.json({ id: p.id, seeded: !!initial });
}
