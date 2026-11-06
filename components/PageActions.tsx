'use client';
import { useRouter } from 'next/navigation';

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

export default function PageActions(p: { pageId: string; title: string; canEdit: boolean; canDelete: boolean; afterDelete?: string; workspaceId?: string; kind?: 'DOC' | 'CANVAS' }) {
  const router = useRouter();
  const run = async (url: string, method: string, body?: unknown) => {
    const { ok, j } = await call(url, method, body);
    if (!ok) { alert(j.error ?? 'Failed'); return null; }
    return j;
  };
  return (
    <span className="flex shrink-0 items-center gap-1 text-sm">
      {p.canEdit && p.workspaceId && (
        <button className="row-action" onClick={async () => {
          const j = await run(`/api/workspaces/${p.workspaceId}/pages`, 'POST', { title: 'Untitled', parentId: p.pageId });
          if (j) { router.push(`/pages/${j.id}`); router.refresh(); }
        }}>Add subpage</button>
      )}
      {p.canEdit && (
        <button className="row-action" onClick={async () => {
          const t = window.prompt('Rename page', p.title)?.trim();
          if (!t || t === p.title) return;
          if (await run(`/api/pages/${p.pageId}`, 'PATCH', { title: t })) router.refresh();
        }}>Rename</button>
      )}
      {p.canEdit && (
        <button className="row-action" onClick={async () => {
          const j = await run(`/api/pages/${p.pageId}/duplicate`, 'POST');
          if (j) { router.push(`/pages/${j.id}`); router.refresh(); }
        }}>Duplicate</button>
      )}
      {p.canEdit && p.kind === 'DOC' && (
        <button className="row-action" onClick={async () => {
          const name = window.prompt('Save this page as a template named', p.title)?.trim();
          if (!name) return;
          const j = await run('/api/templates', 'POST', { pageId: p.pageId, name });
          if (j) router.push('/templates?tab=mine');
        }}>Save as template</button>
      )}
      {p.canDelete && (
        <button className="row-action-danger" onClick={async () => {
          if (!(await run(`/api/pages/${p.pageId}`, 'DELETE'))) return;
          if (p.afterDelete) router.push(p.afterDelete);
          router.refresh();
        }}>Delete</button>
      )}
    </span>
  );
}