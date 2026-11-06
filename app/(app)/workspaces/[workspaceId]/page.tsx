
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_LABEL, type Role } from '@/lib/roles';
import { ActionButton, ActionForm } from '@/components/Actions';
import { AddMember, RoleSelect } from '@/components/Members';
import PageActions from '@/components/PageActions';
import Breadcrumb from '@/components/Breadcrumb';
import Icon, { PageIcon } from '@/components/Icon';
import { ago } from '@/lib/time';

export default async function WorkspacePage({ params }: { params: { workspaceId: string } }) {
  const u = await requireUser();
  const w = await prisma.workspace.findFirst({
    where: { id: params.workspaceId, members: { some: { userId: u.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: 'asc' } },
      pages: { orderBy: { updatedAt: 'desc' } },
    },
  });
  if (!w) notFound();
  const owner = w.ownerId === u.id;
  const myRole: Role = owner ? 'OWNER' : (w.members.find((m) => m.user.id === u.id)?.role ?? 'VIEWER');
  const admin = owner || myRole === 'ADMIN';
  const canWrite = myRole !== 'VIEWER';
  const kids = new Map<string | null, typeof w.pages>();
  const ids = new Set(w.pages.map((p) => p.id));
  w.pages.forEach((p) => {
  const k = p.parentId && ids.has(p.parentId) ? p.parentId : null;
    kids.set(k, [...(kids.get(k) ?? []), p]);
  });
  const rows: { p: (typeof w.pages)[number]; depth: number }[] = [];
  const walk = (k: string | null, depth: number) => (kids.get(k) ?? []).forEach((p) => { rows.push({ p, depth }); walk(p.id, depth + 1); });
  walk(null, 0);
  const api = `/api/workspaces/${w.id}`;
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <header className="space-y-4">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: w.name }]} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-2xl font-semibold text-accent-dark">{w.name.trim()[0]?.toUpperCase() ?? '?'}</span>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight">{w.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="badge">{ROLE_LABEL[myRole]}</span>
                <span>{w.pages.length} pages · {w.members.length} members</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/workspaces/${w.id}/tasks`} className="btn-secondary"><Icon name="tasks" />Open task board</Link>
            {owner && <ActionButton url={api} label="Delete workspace" goto="/dashboard" variant="outline" />}
          </div>
        </div>
      </header>

      {owner && (
        <section aria-labelledby="gen-h" className="card p-5">
          <h2 id="gen-h" className="mb-3 font-semibold">General</h2>
          <label className="mb-1 block text-sm text-gray-600">Workspace name</label>
          <ActionForm url={api} method="PATCH" name="name" defaultValue={w.name} keep placeholder="Workspace name" button="Rename" />
        </section>
      )}

      <section aria-labelledby="pages-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="pages-h" className="text-lg font-semibold">Pages <span className="text-sm font-normal text-gray-600">({w.pages.length})</span></h2>
          {canWrite && <ActionForm url={`${api}/pages`} name="title" placeholder="New page title" button="Create page" gotoPrefix="/pages" />}
        </div>
        {w.pages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#d3d2ce] p-8 text-center text-gray-600">No pages yet.</p>
        ) : (
          <ul className="card divide-y divide-[#e9e9e7] overflow-hidden">
            {rows.map(({ p, depth }) => (
              <li key={p.id} className="group flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#f7f6f3]" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
                <Link href={`/pages/${p.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <PageIcon icon={p.icon} kind={p.kind} />
                  <span className="truncate">{p.title}</span>
                </Link>
                <span className="hidden shrink-0 text-sm text-gray-600 sm:block">{ago(p.updatedAt)}</span>
                <PageActions pageId={p.id} title={p.title} canEdit={canWrite} canDelete={admin || p.createdBy === u.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="members-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="members-h" className="text-lg font-semibold">Members <span className="text-sm font-normal text-gray-600">({w.members.length})</span></h2>
          {admin && <AddMember workspaceId={w.id} isOwner={owner} />}
        </div>
        <ul className="card divide-y divide-[#e9e9e7] overflow-hidden">
          {w.members.map((m) => {
            const editable = admin && m.role !== 'OWNER' && m.user.id !== u.id && (owner || m.role !== 'ADMIN');
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ebeae6] text-sm font-medium">{m.user.name.trim()[0]?.toUpperCase() ?? '?'}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.user.name}</span>
                    <span className="block truncate text-sm text-gray-600">{m.user.email}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {editable ? (
                    <RoleSelect workspaceId={w.id} userId={m.user.id} role={m.role} isOwner={owner} />
                  ) : (
                    <span className="badge">{ROLE_LABEL[m.role]}</span>
                  )}
                  {editable && <ActionButton url={`${api}/members?userId=${m.user.id}`} label="Remove" />}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
