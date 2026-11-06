
import { getTemplate } from '@/lib/templates';
import { coverSvg } from '@/lib/templateCover';

// Public, static banner for a built-in template (same for every user, safe to cache).
export async function GET(_: Request, { params }: { params: { key: string } }) {
  const t = getTemplate(params.key);
  if (!t) return new Response('Not found', { status: 404 });
  return new Response(coverSvg(t.key, t.icon), { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } });
}
