'use client';
import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import MentionInput, { type Person } from './MentionInput';

export type Perm = 'VIEW' | 'COMMENT' | 'EDIT';

async function j(url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? 'Request failed');
  return d;
}
const fmt = (s: string) => new Date(s).toLocaleString();
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Failed');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------------- Comments ---------------- */
type C = { id: string; content: string; resolved: boolean; createdAt: string; user: { id: string; name: string }; replies?: C[] };

export function Comments({ pageId, perm, userId }: { pageId: string; perm: Perm; userId: string }) {
  const [list, setList] = useState<C[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [draft, setDraft] = useState<{ text: string; ids: string[] }>({ text: '', ids: [] });
  const [reply, setReply] = useState<{ id: string; text: string; ids: string[] } | null>(null);
  const [err, setErr] = useState('');
  const can = perm !== 'VIEW';
  const base = `/api/pages/${pageId}/comments`;

  const load = useCallback(() => j(base).then(setList).catch((e) => setErr(msg(e))), [base]);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { j(`/api/pages/${pageId}/people`).then(setPeople).catch(() => {}); }, [pageId]);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); setErr(''); await load(); } catch (e) { setErr(msg(e)); }
  };

  // Highlight @Name for people who can access this page.
  const names = people.map((p) => p.name).filter(Boolean).sort((a, b) => b.length - a.length);
  const re = names.length ? new RegExp(`(@(?:${names.map(escapeRe).join('|')}))`, 'g') : null;
  const body = (s: string) =>
    re ? s.split(re).map((part, i) => (i % 2 ? <span key={i} className="rounded bg-accent-soft px-0.5 text-accent-dark">{part}</span> : part)) : s;

  const item = (c: C, top: boolean) => (
    <div key={c.id} className={`${top ? '' : 'ml-4 mt-2 border-l pl-3'} text-sm`}>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{c.user.name} · {fmt(c.createdAt)}{c.resolved ? ' · resolved' : ''}</span>
        {c.user.id === userId && <button className="text-red-600" onClick={() => run(() => j(`/api/comments/${c.id}`, 'DELETE'))}>Delete</button>}
      </div>
      <p className="whitespace-pre-wrap">{body(c.content)}</p>
      {top && can && (
        <div className="flex gap-3 text-xs text-accent">
          <button onClick={() => setReply({ id: c.id, text: '', ids: [] })}>Reply</button>
          <button onClick={() => run(() => j(`/api/comments/${c.id}`, 'PATCH', { resolved: !c.resolved }))}>{c.resolved ? 'Reopen' : 'Resolve'}</button>
        </div>
      )}
      {c.replies?.map((r) => item(r, false))}
      {reply?.id === c.id && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => j(base, 'POST', { content: reply.text, parentId: c.id, mentions: reply.ids })).then(() => setReply(null));
          }}
        >
          <MentionInput autoFocus label="Reply" placeholder="Reply… (@ to mention)" people={people} value={reply.text} onChange={(text, ids) => setReply({ id: c.id, text, ids })} />
          <button className="btn">Send</button>
        </form>
      )}
    </div>
  );
  return (
    <div className="space-y-3">
      {can && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => j(base, 'POST', { content: draft.text, mentions: draft.ids })).then(() => setDraft({ text: '', ids: [] }));
          }}
        >
          <MentionInput label="Add a comment" placeholder="Add a comment… (@ to mention)" people={people} value={draft.text} onChange={(text, ids) => setDraft({ text, ids })} />
          <button className="btn">Post</button>
        </form>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {list.length === 0 && <p className="text-sm text-gray-600">No comments yet.</p>}
      {list.map((c) => item(c, true))}
    </div>
  );
}

/* ---------------- Version history ---------------- */
type V = { id: string; label: string | null; createdAt: string; createdBy: { name: string } | null };

export function Versions({ pageId, perm, doc }: { pageId: string; perm: Perm; doc: Y.Doc }) {
  const [list, setList] = useState<V[]>([]);
  const [sel, setSel] = useState<{ id: string; snap: Y.Doc; text: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/api/pages/${pageId}/versions`;
  const load = useCallback(() => j(base).then(setList).catch((e) => setErr(msg(e))), [base]);
  useEffect(() => { load(); }, [load]);

  const save = async (label?: string) => { await j(base, 'POST', { label }); await load(); };
  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); setErr(''); } catch (e) { setErr(msg(e)); }
    setBusy(false);
  };
  const open = (id: string) => wrap(async () => {
    const d = await j(`/api/versions/${id}`);
    const snap = new Y.Doc();
    Y.applyUpdate(snap, Uint8Array.from(atob(d.data), (c) => c.charCodeAt(0)));
    const text = snap.getXmlFragment('default').toString()
      .replace(/<\/(paragraph|heading|listItem|taskItem|blockquote|codeBlock|tableRow)>/g, '\n')
      .replace(/<\/(tableCell|tableHeader)>/g, ' | ')
      .replace(/<[^>]+>/g, '');
    setSel({ id, snap, text });
  });
  // Restore = controlled CRDT edit of the live doc (needs EDIT; enforced by the collab server). Old state is kept as a version first.
  const restore = () => wrap(async () => {
    if (!sel || !confirm('Restore this version for all collaborators?')) return;
    await save('Before restore');
    const frag = doc.getXmlFragment('default');
    doc.transact(() => {
      frag.delete(0, frag.length);
      frag.insert(0, sel.snap.getXmlFragment('default').toArray().map((n) => n.clone() as Y.XmlElement));
    });
    setSel(null);
  });

  return (
    <div className="space-y-3 text-sm">
      {perm === 'EDIT' && <button className="btn" disabled={busy} onClick={() => wrap(() => save())}>Save version</button>}
      {err && <p className="text-red-600">{err}</p>}
      {list.length === 0 && <p className="text-gray-600">No versions yet.</p>}
      <ul className="divide-y">
        {list.map((v) => (
          <li key={v.id}>
            <button className={`w-full py-2 text-left ${sel?.id === v.id ? 'font-semibold' : ''}`} onClick={() => open(v.id)}>
              {v.label ?? 'Version'} <span className="block text-xs text-gray-600">{fmt(v.createdAt)} · {v.createdBy?.name ?? 'unknown'}</span>
            </button>
          </li>
        ))}
      </ul>
      {sel && (
        <div className="space-y-2 rounded border bg-gray-50 p-2">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{sel.text || '(empty)'}</pre>
          {perm === 'EDIT' && <button className="btn" disabled={busy} onClick={restore}>Restore this version</button>}
        </div>
      )}
    </div>
  );
}

/* ---------------- Sharing ---------------- */
type Entry = { userId: string; name: string; email: string; permission: Perm };

export function Share({ pageId }: { pageId: string }) {
  const [d, setD] = useState<{ owner: { name: string; email: string }; entries: Entry[] } | null>(null);
  const [email, setEmail] = useState('');
  const [perm, setPerm] = useState<Perm>('VIEW');
  const [err, setErr] = useState('');
  const base = `/api/pages/${pageId}/permissions`;
  const load = useCallback(() => j(base).then(setD).catch((e) => setErr(msg(e))), [base]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); setErr(''); await load(); } catch (e) { setErr(msg(e)); }
  };
  const Sel = ({ v, on }: { v: Perm; on: (p: Perm) => void }) => (
    <select value={v} onChange={(e) => on(e.target.value as Perm)}>
      <option value="VIEW">View</option>
      <option value="COMMENT">Comment</option>
      <option value="EDIT">Edit</option>
    </select>
  );
  return (
    <div className="space-y-3 text-sm">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(() => j(base, 'PUT', { email, permission: perm })).then(() => setEmail('')); }}>
        <input className="min-w-0 flex-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User email" required />
        <Sel v={perm} on={setPerm} />
        <button className="btn">Share</button>
      </form>
      {err && <p className="text-red-600">{err}</p>}
      {d && (
        <ul className="divide-y">
          <li className="py-2">{d.owner.name} <span className="text-xs text-gray-600">{d.owner.email} · owner (full access)</span></li>
          {d.entries.map((e) => (
            <li key={e.userId} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate">{e.name}<span className="block text-xs text-gray-600">{e.email}</span></span>
              <span className="flex items-center gap-2">
                <Sel v={e.permission} on={(p) => run(() => j(base, 'PUT', { email: e.email, permission: p }))} />
                <button className="text-red-600" onClick={() => run(() => j(`${base}?userId=${e.userId}`, 'DELETE'))}>Revoke</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-600">Workspace members have Edit access by default; adding a row here overrides it for that user.</p>
    </div>
  );
}