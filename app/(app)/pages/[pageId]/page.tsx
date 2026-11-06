import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManage, getPerm, getWsRole } from '@/lib/permissions';
import Editor from '@/components/Editor';
import Canvas from '@/components/Canvas';
import CopyLinkButton from '@/components/CopyLinkButton';
import { ago } from '@/lib/time';
import { getSettings } from '@/lib/settings';
import LocalTime from '@/components/LocalTime';
import PageActions from '@/components/PageActions';
import FavoriteButton from '@/components/FavoriteButton'

const COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d']; // 6-digit hex (selection alpha suffix)
const colorFor = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export default async function PageView({ params, searchParams }: { params: { pageId: string }; searchParams: { collab?: string } }) {
  const u = await requireUser();
  const perm = await getPerm(u.id, params.pageId);
  if (!perm) notFound();
  const st = await getSettings(u.id);
  if (st.trackRecents) await prisma.pageVisit
    .upsert({ where: { userId_pageId: { userId: u.id, pageId: params.pageId } }, update: { visitedAt: new Date() }, create: { userId: u.id, pageId: params.pageId } })
    .catch(() => {});
  const page = await prisma.page.findUniqueOrThrow({ where: { id: params.pageId }, select: { title: true, kind: true, icon: true, cover: true, fullWidth: true, smallText: true, hidePanel: true, updatedAt: true, parentId: true, workspace: { select: { id: true, name: true } } } });
  const manage = await canManage(u.id, params.pageId);
  const isFav = !!(await prisma.favorite.findUnique({ where: { userId_pageId: { userId: u.id, pageId: params.pageId } }, select: { id: true } }));
  
  const isMember = !!(await getWsRole(u.id, page.workspace.id));
  const crumbs: { id: string; title: string }[] = [];
  for (let pid = page.parentId, i = 0; pid && i < 20; i++) {
    const a = await prisma.page.findUnique({ where: { id: pid }, select: { id: true, title: true, parentId: true } });
    if (!a || !(await getPerm(u.id, a.id))) break;
    crumbs.unshift({ id: a.id, title: a.title });
    pid = a.parentId;
  }
  // Dev-only override to attach a browser to a specific collab instance (e.g. ?collab=ws://localhost:1235)
  const override = process.env.NODE_ENV !== 'production' && /^ws:\/\/localhost:\d+$/.test(searchParams.collab ?? '') ? searchParams.collab : undefined;
  const collabUrl = override ?? process.env.NEXT_PUBLIC_COLLABORATION_URL!;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-3 text-sm">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-gray-500">
          {isMember ? <Link href={`/workspaces/${page.workspace.id}`} className="hover:underline">{page.workspace.name}</Link> : <span>{page.workspace.name}</span>}
          {crumbs.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <span>/</span>
              <Link href={`/pages/${c.id}`} className="hover:underline">{c.title}</Link>
            </span>
          ))}
          <span>/</span>
          <span className="truncate text-gray-900">{page.title}</span>
        </nav>
        <span className="flex items-center gap-3">
          <span className="text-gray-500">Edited {st.dateFormat === 'absolute' ? <LocalTime iso={page.updatedAt.toISOString()} /> : ago(page.updatedAt)}</span>
          <CopyLinkButton />
          <FavoriteButton pageId={params.pageId} initial={isFav} />
          <PageActions kind={page.kind} pageId={params.pageId} title={page.title} canEdit={perm === 'EDIT'} canDelete={manage} afterDelete={`/workspaces/${page.workspace.id}`} workspaceId={page.workspace.id} />
        </span>
      </div>
      {page.kind === 'CANVAS' ? (
        <Canvas pageId={params.pageId} title={page.title} icon={page.icon} perm={perm} canManage={manage} collabUrl={collabUrl} user={{ id: u.id, name: u.name, color: colorFor(u.id) }} />
      ) : (
        <Editor
          pageId={params.pageId}
          title={page.title}
          icon={page.icon}
          cover={page.cover}
          fullWidth={page.fullWidth}
          smallText={page.smallText}
          hidePanel={page.hidePanel}
          perm={perm}
          canManage={manage}
          collabUrl={collabUrl}
          user={{ id: u.id, name: u.name, color: colorFor(u.id) }}
        />
      )}
    </>
  );
}