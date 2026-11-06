import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, gate, limited } from '@/lib/api';

const MAX = 5 * 1024 * 1024;

// Checks the real file signature, not just the type the browser claims.
function sniff(b: Buffer): string | null {
  if (b.length > 8 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 6 && b.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function POST(req: Request, { params }: { params: { pageId: string } }) {
  const g = await gate(params.pageId, 'EDIT');
  if ('res' in g) return g.res;
  if (limited(req, `upload:${g.user.id}`, 30, 60_000)) return fail('Too many uploads. Try again in a minute.', 429);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail('Choose an image file');
  if (file.size > MAX) return fail('Image is too large (max 5 MB)', 413);
  const data = Buffer.from(await file.arrayBuffer());
  const mime = sniff(data);
  if (!mime) return fail('Only PNG, JPEG, GIF or WebP images are allowed', 415);
  const row = await prisma.upload.create({ data: { pageId: params.pageId, userId: g.user.id, mime, size: data.length, data }, select: { id: true } });
  return NextResponse.json({ url: `/api/uploads/${row.id}` });
}
