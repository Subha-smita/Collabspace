import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/api';

// Serves the cover image stored with one of the caller's own templates.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const u = await getUser();
  if (!u) return fail('Unauthorized', 401);
  const t = await prisma.customTemplate.findFirst({ where: { id: params.id, ownerId: u.id }, select: { coverData: true, coverMime: true } });
  if (!t?.coverData || !t.coverMime) return fail('Not found', 404);
  return new Response(new Uint8Array(t.coverData), { headers: { 'Content-Type': t.coverMime, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' } });
}
