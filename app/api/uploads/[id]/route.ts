import { prisma } from '@/lib/prisma';
import { fail, gate } from '@/lib/api';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const u = await prisma.upload.findUnique({ where: { id: params.id }, select: { pageId: true, mime: true, data: true, page: { select: { published: true } } } });
  if (!u) return fail('Not found', 404);
  if (!u.page.published) {
    const g = await gate(u.pageId, 'VIEW');
    if ('res' in g) return g.res;
  }
  return new Response(new Uint8Array(u.data), {
    headers: { 'Content-Type': u.mime, 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' },
  });
}
