
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { loadDocJson } from '@/lib/publicDoc';
import { coverStyle } from '@/lib/covers';
import PublicDoc from '@/components/PublicDoc';

export const dynamic = 'force-dynamic';

const find = (id: string) =>
  prisma.page.findFirst({ where: { id, published: true, kind: 'DOC' }, select: { title: true, icon: true, cover: true, publishIndex: true, fullWidth: true, smallText: true } });

export async function generateMetadata({ params }: { params: { pageId: string } }): Promise<Metadata> {
  const p = await find(params.pageId);
  if (!p) return { title: 'Not found', robots: { index: false } };
  return { title: `${p.title} – CollabSpace`, robots: p.publishIndex ? { index: true, follow: true } : { index: false, follow: false } };
}

export default async function PublicPage({ params }: { params: { pageId: string } }) {
  const p = await find(params.pageId);
  if (!p) notFound();
  const json = await loadDocJson(params.pageId);
  return (
    <div className={p.smallText ? 'text-sm' : undefined}>
      {p.cover && <div role="img" aria-label="Page cover" className="h-48 w-full" style={coverStyle(p.cover)} />}
      <main className={`mx-auto px-6 pb-24 pt-8 ${p.fullWidth ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {p.icon && <div aria-hidden className="mb-2 text-6xl leading-none">{p.icon}</div>}
        <h1 className="mb-4 text-4xl font-bold text-[#37352f]">{p.title}</h1>
        <PublicDoc json={json} />
      </main>
      <footer className="fixed bottom-3 right-3">
        <Link href="/" className="rounded-md border border-[#e3e2de] bg-white px-3 py-1.5 text-sm text-[#37352f] shadow-sm hover:bg-[#f7f6f3]">Made with CollabSpace</Link>
      </footer>
    </div>
  );
}
