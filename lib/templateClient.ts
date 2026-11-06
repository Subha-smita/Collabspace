
// Browser helper: create a brand-new page from a template. Returns the URL to open, or an error message.
export async function createFromTemplate(o: { workspaceId: string; tplRef: string; title: string; kind: 'DOC' | 'CANVAS'; icon?: string | null; canvasKey?: string }): Promise<{ href: string } | { error: string }> {
  if (!o.workspaceId) return { error: 'Create a workspace first.' };
  const r = await fetch(`/api/workspaces/${o.workspaceId}/pages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: o.title.slice(0, 120), kind: o.kind, icon: o.icon ?? undefined, template: o.tplRef }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: j.error ?? 'Could not create the page' };
  // Canvas (or an unseeded doc) falls back to the editor applying the template itself.
  return { href: !j.seeded && o.canvasKey ? `/pages/${j.id}?template=${o.canvasKey}` : `/pages/${j.id}` };
}
