'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon, { PageIcon } from './Icon';

type Perm = 'VIEW' | 'COMMENT' | 'EDIT';
type Choice = { id: string; title: string; kind: 'DOC' | 'CANVAS'; icon: string | null };
type Entry = { userId: string; name: string; email: string; permission: Perm };
type People = { owner: { name: string; email: string }; entries: Entry[] };
type Settings = { linkAccess: 'RESTRICTED' | 'ANYONE'; linkPermission: Perm; published: boolean; publishedAt: string | null; publishIndex: boolean; kind: 'DOC' | 'CANVAS' };
const LABEL: Record<Perm, string> = { VIEW: 'Can view', COMMENT: 'Can comment', EDIT: 'Can edit' };
const PERM_OPTS = (Object.keys(LABEL) as Perm[]).map((p) => ({ value: p, label: LABEL[p] }));
const BLUE = 'bg-[#2383e2] text-white hover:bg-[#0b6ec5]';
const TIP_KEY = 'cs-share-advanced-tip';

async function api(url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? 'Request failed');
  return d;
}

type Opt<T> = { value: T; label: string; desc?: string; danger?: boolean };
function Dropdown<T extends string>({ value, options, onChange, label, disabled, strong }: { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string; disabled?: boolean; strong?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);
  const cur = options.find((o) => o.value === value);
  return (
    <span className="relative" ref={ref}>
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[#ebeae6] disabled:opacity-60 disabled:hover:bg-transparent ${strong ? 'text-[15px] text-[#37352f]' : 'text-gray-600'}`}>
        {cur?.label ?? value}<Icon name="down" size={13} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-full z-50 mt-1 min-w-[13rem] rounded-lg border border-[#e9e9e7] bg-white p-1 shadow-lg">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button type="button" onClick={() => { setOpen(false); if (o.value !== value) onChange(o.value); }}
                className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#f1f0ee] ${o.danger ? 'text-red-700' : 'text-[#37352f]'}`}>
                <span className="min-w-0 flex-1"><span className="block">{o.label}</span>{o.desc && <span className="block text-xs text-gray-500">{o.desc}</span>}</span>
                {o.value === value && <Icon name="check" size={14} className="mt-0.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

const avatar = (name: string) => (
  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e3e2de] bg-white text-sm text-[#37352f]">{name.trim()[0]?.toUpperCase() ?? '?'}</span>
);

export default function SharePopover({ pageId, userEmail, canManage, variant = 'header', choices = [] }: { pageId?: string; userEmail: string; canManage?: boolean; variant?: 'header' | 'sidebar' | 'collab'; choices?: Choice[] }) {
  const [picked, setPicked] = useState<{ id: string; title: string } | null>(null); // used when no page is open (e.g. Home)
  const pid = pageId ?? picked?.id ?? '';
  const [manage, setManage] = useState(canManage ?? true); // sidebar variant learns this from the API
  useEffect(() => { if (canManage !== undefined) setManage(canManage); }, [canManage]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'share' | 'publish'>('share');
  const [people, setPeople] = useState<People | null>(null);
  const [st, setSt] = useState<Settings | null>(null);
  const [email, setEmail] = useState('');
  const [perm, setPerm] = useState<Perm>('EDIT');
  const [adv, setAdv] = useState(false);
  const [help, setHelp] = useState(false);
  const [tipHidden, setTipHidden] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'app' | 'pub' | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ left: 8, top: 8 });
  const base = `/api/pages/${pid}`;

  useEffect(() => { try { setTipHidden(localStorage.getItem(TIP_KEY) === '1'); } catch { setTipHidden(false); } }, []);
  const hideTip = () => { setTipHidden(true); try { localStorage.setItem(TIP_KEY, '1'); } catch { /* ignore */ } };

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api(`${base}/permissions`), api(`${base}/share`)]);
      setPeople(p); setSt(s);
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Failed to load';
      if (m === 'Forbidden') { setManage(false); setTab('share'); } else setErr(m);
    }
  }, [base]);
  useEffect(() => { if (open && manage && pid) load(); }, [open, manage, pid, load]);
  useEffect(() => { setManage(canManage ?? true); setPeople(null); setSt(null); setErr(''); setTab('share'); setAdv(false); }, [pid, canManage]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); setErr(''); await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    setBusy(false);
  };
  const patch = (b: Partial<Settings>) => run(() => api(`${base}/share`, 'PATCH', b));
  const copy = async (which: 'app' | 'pub') => {
    const url = window.location.origin + (which === 'app' ? `/pages/${pid}` : `/p/${pid}`);
    try { await navigator.clipboard.writeText(url); setCopied(which); setTimeout(() => setCopied(null), 1500); } catch { alert('Could not copy the link'); }
  };
  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const r = await api(`${base}/permissions`, 'PUT', { email, permission: perm });
      setEmail('');
      if (r.missing?.length) throw new Error(`Not registered: ${r.missing.join(', ')}`);
    });
  };

  const shared = (people?.entries.length ?? 0) > 0 || st?.linkAccess === 'ANYONE';
  const pubUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/p/${pid}`;
  const isYou = people?.owner.email.toLowerCase() === userEmail.toLowerCase();
  const tabs = manage ? (['share', 'publish'] as const) : (['share'] as const);
  const showShare = tab === 'share';

  const side = variant !== 'header';
  const toggleSide = () => {
    if (!open && trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      setPos({ left: Math.max(8, Math.min(r.right + 8, window.innerWidth - 416 - 8)), top: Math.max(8, Math.min(r.top - 8, window.innerHeight - 580)) });
    }
    setOpen(!open);
  };
  const shell = side ? 'fixed z-[100] max-h-[calc(100vh-1rem)] w-[26rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-[#e9e9e7] bg-white text-sm shadow-[0_8px_30px_rgba(15,15,15,0.14)]' : 'absolute right-0 top-full z-40 mt-2 w-[26rem] max-w-[92vw] rounded-xl border border-[#e9e9e7] bg-white text-sm shadow-xl';
  const dialog = (
        <div role="dialog" aria-label="Share" ref={panelRef} style={side ? { left: pos.left, top: pos.top } : undefined} className={shell}>
          <div className={`flex items-center justify-between border-b border-[#e9e9e7] px-4`}>
            <div role="tablist" className="flex gap-4">
              {tabs.map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 py-2.5 text-[15px] font-medium capitalize ${tab === t ? 'border-[#37352f] text-[#37352f]' : 'border-transparent text-gray-500 hover:text-[#37352f]'}`}>{t}</button>
              ))}
            </div>
            <button type="button" aria-expanded={help} aria-label="Learn about sharing" title="Learn about sharing" onClick={() => setHelp(!help)} className="flex items-center gap-1.5 rounded px-1 py-1 text-gray-500 hover:text-[#37352f]"><Icon name="help" size={15} />Learn about sharing</button>
          </div>

          <div className={`space-y-3 p-4`}>
            {help && (
              <p className="rounded-lg bg-[#f7f6f3] p-3 text-xs leading-relaxed text-gray-700">
                Invite people by email to give them access to this page. &ldquo;Anyone with the link&rdquo; lets any signed-in CollabSpace user open it. Publish makes a public, read-only website that needs no sign-in.
              </p>
            )}
            {!manage && <p className="text-gray-600">Only the page creator or a workspace admin can change sharing for this page.</p>}
            {err && <p role="alert" className="text-red-700">{err}</p>}

            {manage && showShare && (
              <>
                <form className={`flex items-center gap-2`} onSubmit={invite}>
                  <input className="h-9 min-w-0 flex-1 !rounded-md !border-[#e3e2de] focus:!border-[#2383e2] focus:!ring-2 focus:!ring-[#2383e2]/30" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email or group, separated by commas" aria-label="Emails to invite" />
                  {email.trim() && <Dropdown value={perm} options={PERM_OPTS} onChange={setPerm} label="Permission for invited people" />}
                  <button className={`h-9 rounded-md px-4 text-sm font-medium disabled:opacity-50 ${BLUE}`} disabled={busy || !email.trim()}>Invite</button>
                </form>

                <ul className="max-h-60 space-y-1 overflow-y-auto">
                  {people && (
                    <li className="flex items-center gap-3 py-1">
                      {avatar(people.owner.name)}
                      <span className="min-w-0 flex-1"><span className="block truncate text-[15px]">{people.owner.name} <span className="text-gray-500">{isYou ? '(You)' : '(owner)'}</span></span><span className="block truncate text-xs text-gray-500">{people.owner.email}</span></span>
                      <span className="flex items-center gap-1 px-2 text-gray-600">Full access<Icon name="down" size={13} className="opacity-40" /></span>
                    </li>
                  )}
                  {people?.entries.map((e) => (
                    <li key={e.userId} className="flex items-center gap-3 py-1">
                      {avatar(e.name)}
                      <span className="min-w-0 flex-1"><span className="block truncate text-[15px]">{e.name}{e.email.toLowerCase() === userEmail.toLowerCase() && <span className="text-gray-500"> (You)</span>}</span><span className="block truncate text-xs text-gray-500">{e.email}</span></span>
                      <Dropdown<Perm | 'REMOVE'> value={e.permission} label={`Access for ${e.name}`}
                        options={[...PERM_OPTS, { value: 'REMOVE', label: 'Remove access', danger: true }]}
                        onChange={(v) => run(() => v === 'REMOVE' ? api(`${base}/permissions?userId=${e.userId}`, 'DELETE') : api(`${base}/permissions`, 'PUT', { email: e.email, permission: v }))} />
                    </li>
                  ))}
                </ul>

                <div>
                  <div className="mb-2 text-xs font-medium text-gray-500">General access</div>
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#efeeeb] text-gray-600"><Icon name={st?.linkAccess === 'ANYONE' ? 'link' : 'lock'} /></span>
                    <span className="min-w-0 flex-1">
                      <Dropdown<Settings['linkAccess']> strong label="General access" disabled={!st || busy} value={st?.linkAccess ?? 'RESTRICTED'}
                        options={[
                          { value: 'RESTRICTED', label: 'Only people invited', desc: 'Workspace members and invited people' },
                          { value: 'ANYONE', label: 'Anyone with the link', desc: 'Any signed-in CollabSpace user' },
                        ]}
                        onChange={(v) => patch({ linkAccess: v })} />
                    </span>
                    {st?.linkAccess === 'ANYONE' && <Dropdown value={st.linkPermission} options={PERM_OPTS} label="Link permission" disabled={busy} onChange={(p) => patch({ linkPermission: p })} />}
                  </div>
                </div>
              </>
            )}

            {manage && tab === 'publish' && st && (
              st.kind === 'CANVAS' ? (
                <p className="text-gray-600">Canvas pages can&rsquo;t be published yet. Publishing is available for document pages.</p>
              ) : st.published ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 font-medium"><span aria-hidden className="h-2 w-2 rounded-full bg-green-600" />This page is live on the web</p>
                  <div className="flex gap-2">
                    <input readOnly value={pubUrl} aria-label="Public link" className="h-9 min-w-0 flex-1" onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className="flex h-9 items-center gap-1.5 rounded-md border border-[#e3e2de] px-3 hover:bg-[#f7f6f3]" onClick={() => copy('pub')}><Icon name={copied === 'pub' ? 'check' : 'copy'} />{copied === 'pub' ? 'Copied' : 'Copy'}</button>
                  </div>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={st.publishIndex} disabled={busy} onChange={(e) => patch({ publishIndex: e.target.checked })} />
                    <span><span className="block">Search engine indexing</span><span className="block text-xs text-gray-500">Let search engines such as Google list this page.</span></span>
                  </label>
                  {st.publishedAt && <p className="text-xs text-gray-500">Published {new Date(st.publishedAt).toLocaleString()}. Visitors always see the latest saved version.</p>}
                  <div className="flex gap-2">
                    <a href={`/p/${pid}`} target="_blank" rel="noopener noreferrer" className="flex h-9 flex-1 items-center justify-center rounded-md border border-[#e3e2de] hover:bg-[#f7f6f3]">View site</a>
                    <button type="button" className="h-9 flex-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={busy} onClick={() => patch({ published: false })}>Unpublish</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-2 text-center">
                  <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#efeeeb] text-gray-600"><Icon name="link" size={22} /></span>
                  <p className="text-[15px] font-medium">Publish to web</p>
                  <p className="text-gray-500">Make this page a public, read-only website anyone can open. No sign-in needed.</p>
                  <button type="button" className={`h-9 w-full rounded-md font-medium disabled:opacity-50 ${BLUE}`} disabled={busy} onClick={() => patch({ published: true })}>Publish</button>
                </div>
              )
            )}
          </div>

          <div className={`flex items-center justify-between border-t border-[#e9e9e7] px-4 py-3`}>
            {manage && showShare ? (
              <button type="button" aria-expanded={adv} onClick={() => setAdv(!adv)} className="flex items-center gap-2 rounded-md px-1 py-1 text-[15px] hover:bg-[#ebeae6]"><Icon name="gear" />Advanced</button>
            ) : <span />}
            <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-[#e3e2de] px-4 text-[15px] font-medium hover:bg-[#f7f6f3]" onClick={() => copy('app')}><Icon name={copied === 'app' ? 'check' : 'link'} />{copied === 'app' ? 'Copied' : 'Copy link'}</button>
          </div>

          {manage && showShare && adv && st && (
            <div className={`mx-4 mb-3 space-y-2 rounded-lg bg-[#f7f6f3] p-3 text-xs text-gray-700`}>
              <p>Link access always requires signing in to CollabSpace. For a public page with no sign-in, use the Publish tab.</p>
              <button type="button" className="font-medium text-red-700 hover:underline disabled:opacity-50 disabled:no-underline" disabled={busy || st.linkAccess === 'RESTRICTED'} onClick={() => patch({ linkAccess: 'RESTRICTED' })}>Turn off link access</button>
            </div>
          )}

          {manage && showShare && !tipHidden && (
            <div className={`mx-4 mb-4 flex items-center justify-between rounded-lg bg-[#e7f3f8] px-4 py-3 text-[#2383e2]`}>
              <button type="button" className="flex-1 text-left font-medium" onClick={() => setAdv(true)}>Control link access in Advanced</button>
              <button type="button" aria-label="Dismiss tip" onClick={hideTip} className="rounded p-1 hover:bg-[#d3e5ef]"><Icon name="x" size={15} /></button>
            </div>
          )}
        </div>
  );
  const picker = (
    <div role="dialog" aria-label="Share" ref={panelRef} style={side ? { left: pos.left, top: pos.top } : undefined} className={shell}>
      <div className="border-b border-[#e9e9e7] px-4 py-2.5 text-[15px] font-medium">Share a page</div>
      <p className="px-4 pt-3 text-gray-500">Open a page to share it, or choose one here.</p>
      <ul className="max-h-72 space-y-0.5 overflow-y-auto p-2">
        {choices.length === 0 && <li className="px-2 py-3 text-gray-500">You don&rsquo;t have any pages yet.</li>}
        {choices.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setPicked({ id: c.id, title: c.title })} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#ebeae6]">
              <PageIcon icon={c.icon} kind={c.kind} /><span className="truncate">{c.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
  const content = pid ? dialog : picker;
  return (
    <span className={side ? 'relative block' : 'relative flex items-center gap-1'} ref={ref}>
      {side ? (
        variant === 'collab' ? (
          <button ref={trigRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={toggleSide} className={`flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[14px] text-[#91918e] transition-colors hover:bg-[#ebeae6] ${open ? 'bg-[#ebeae6]' : 'bg-[#efeeeb]/70'}`}>
            <Icon name="plus" />Start collaborating
          </button>
        ) : (
          <button ref={trigRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={toggleSide} className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[14px] text-[#5f5e5b] transition-colors hover:bg-[#ebeae6]">
            <Icon name={shared || st?.published ? 'users' : 'lock'} />Share
          </button>
        )
      ) : (
        <>
          <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-[#ebeae6] ${open ? 'bg-[#ebeae6]' : ''}`}>
            <Icon name={shared || st?.published ? 'users' : 'lock'} />Share
          </button>
          <button type="button" title="Copy link" aria-label="Copy link" onClick={() => copy('app')} className="rounded-md p-1.5 hover:bg-[#ebeae6]"><Icon name={copied === 'app' ? 'check' : 'link'} /></button>
        </>
      )}

      {open && (side ? createPortal(content, document.body) : content)}
    </span>
  );
}
