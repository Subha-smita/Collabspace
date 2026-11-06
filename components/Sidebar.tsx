'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import SearchPalette from './SearchPalette';
import SharePopover from './SharePopover';
import { SidebarSections } from './SettingsUI';
import Icon, { PageIcon, type IconName } from './Icon';
import type { SectionKey } from '@/lib/settingsShared';

type P = { id: string; title: string; parentId: string | null; kind: 'DOC' | 'CANVAS'; icon: string | null };
type W = { id: string; name: string; pages: P[] };
type F = { id: string; title: string; kind: 'DOC' | 'CANVAS'; icon: string | null };

// Pages whose parent isn't in the list are shown at the top level.
function tree(pages: P[]) {
  const ids = new Set(pages.map((p) => p.id));
  const by = new Map<string | null, P[]>();
  pages.forEach((p) => {
    const k = p.parentId && ids.has(p.parentId) ? p.parentId : null;
    by.set(k, [...(by.get(k) ?? []), p]);
  });
  return by;
}

const ROW = 'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[14px] transition-colors';
const IDLE = 'text-[#5f5e5b] hover:bg-[#ebeae6]';
const ON = 'bg-[#ebeae6] font-medium text-[#37352f]';
const HEAD = 'px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#91918e]';

export default function Sidebar({ workspaces, shared, favorites, recents, hidden, unread, userName, userEmail }: {
  workspaces: W[]; shared: P[]; favorites: F[]; recents: F[]; hidden: SectionKey[]; unread: number; userName: string; userEmail: string;
}) {
  const path = usePathname();
  const curPage = path.match(/^\/pages\/([^/?#]+)/)?.[1];
  const shareChoices = [...recents, ...workspaces.flatMap((w) => w.pages)].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i).slice(0, 12);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [badge, setBadge] = useState(unread);
  const [menu, setMenu] = useState(false);
  const [customize, setCustomize] = useState(false);
  const show = (k: SectionKey) => !hidden.includes(k);

  useEffect(() => { setBadge(unread); }, [unread]);
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch('/api/notifications');
        if (r.ok) setBadge((await r.json()).unread);
      } catch {}
    };
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const cls = (href: string) => `${ROW} ${path === href ? ON : IDLE}`;
  const close = () => setOpen(false);
  const toggle = (id: string) =>
    setClosed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function newPage(wid: string, parentId?: string) {
    setBusy(parentId ?? wid);
    const r = await fetch(`/api/workspaces/${wid}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', parentId }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy('');
    if (!r.ok) return alert(j.error ?? 'Failed to create page');
    if (parentId) setClosed((s) => { const n = new Set(s); n.delete(parentId); return n; });
    close();
    router.push(`/pages/${j.id}`);
    router.refresh();
  }

  const pageLink = (p: F) => (
    <div key={p.id} className="flex"><Link href={`/pages/${p.id}`} onClick={close} className={cls(`/pages/${p.id}`)}><PageIcon icon={p.icon} kind={p.kind} /><span className="truncate">{p.title}</span></Link></div>
  );

  const branch = (by: Map<string | null, P[]>, parent: string | null, wid: string): ReactNode =>
    (by.get(parent) ?? []).map((p) => {
      const kids = by.get(p.id) ?? [];
      const isClosed = closed.has(p.id);
      return (
        <div key={p.id}>
          <div className="group flex items-center">
            {kids.length ? (
              <button type="button" className="flex h-5 w-5 items-center justify-center rounded text-[#91918e] hover:bg-[#ebeae6]" aria-label={isClosed ? 'Expand' : 'Collapse'} aria-expanded={!isClosed} onClick={() => toggle(p.id)}>
                <Icon name={isClosed ? 'right' : 'down'} size={12} />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <Link href={`/pages/${p.id}`} onClick={close} className={cls(`/pages/${p.id}`)}><PageIcon icon={p.icon} kind={p.kind} /><span className="truncate">{p.title}</span></Link>
            <button
              type="button"
              className="rounded p-1 text-[#91918e] hover:bg-[#ebeae6] disabled:opacity-50 lg:opacity-0 lg:focus:opacity-100 lg:group-hover:opacity-100"
              aria-label={`New subpage in ${p.title}`}
              title="Add subpage"
              disabled={busy === p.id}
              onClick={() => newPage(wid, p.id)}
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
          {kids.length > 0 && !isClosed && <div className="ml-3 border-l border-[#e9e9e7] pl-1">{branch(by, p.id, wid)}</div>}
        </div>
      );
    });

  const first = workspaces[0];
  const initial = (userName.trim()[0] ?? '?').toUpperCase();
  const act = (icon: IconName, label: string, onClick: () => void, disabled = false) => (
    <div className="flex"><button type="button" disabled={disabled} onClick={onClick} className={`${ROW} ${IDLE} disabled:opacity-50`}><Icon name={icon} /><span className="truncate">{label}</span></button></div>
  );

  return (
    <aside className="border-b border-[#e9e9e7] bg-[#f7f6f3] lg:sticky lg:top-0 lg:max-h-screen lg:w-64 lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-3 pt-3">
        <Link href="/settings" onClick={close} title="Settings" className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[#ebeae6]">
          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-white">{initial}</span>
          <span className="truncate text-sm font-medium">{userName}</span>
        </Link>
        <div className="relative flex items-center gap-0.5 text-[#5f5e5b]">
          <Link href="/updates" onClick={close} title="Inbox" aria-label={badge > 0 ? `Inbox, ${badge} unread` : 'Inbox'} className={`relative rounded-md p-1.5 hover:bg-[#ebeae6] ${path === '/updates' ? 'bg-[#ebeae6]' : ''}`}>
            <Icon name="inbox" size={18} />
            {badge > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-white">{badge > 99 ? '99+' : badge}</span>}
          </Link>
          <button type="button" title="New" aria-label="New" aria-expanded={menu} onClick={() => setMenu(!menu)} className="rounded-md p-1.5 hover:bg-[#ebeae6]">
            <Icon name="edit" size={18} />
          </button>
          {menu && (
            <>
              <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute right-0 top-9 z-30 w-48 rounded-lg border border-[#e9e9e7] bg-white p-1 text-[#37352f] shadow-lg">
                {first && (
                  <>
                    <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm hover:bg-[#f1f0ee]" onClick={() => { setMenu(false); newPage(first.id); }}><Icon name="doc" />Page</button>
                  </>
                )}
                <Link role="menuitem" href="/templates" className="flex items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-[#f1f0ee]" onClick={() => { setMenu(false); close(); }}><Icon name="layout" />From template</Link>
                <Link role="menuitem" href="/ai" className="flex items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-[#f1f0ee]" onClick={() => { setMenu(false); close(); }}><Icon name="chat" />Chat</Link>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="p-3 pb-0"><SearchPalette /></div>
      <button className="w-full px-4 py-2 text-left text-sm lg:hidden" aria-expanded={open} aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
        ☰ Menu
      </button>
      <nav className={`${open ? 'block' : 'hidden'} space-y-5 p-3 lg:block`} aria-label="Sidebar">
        <div className="space-y-0.5">
          <div className="flex"><Link href="/dashboard" onClick={close} className={cls('/dashboard')}><Icon name="home" />Home</Link></div>
          {first ? act('note', 'New note', () => newPage(first.id), busy === first.id) : <div className="flex"><Link href="/dashboard" onClick={close} className={`${ROW} ${IDLE}`}><Icon name="note" />New note</Link></div>}
          <div className="flex"><Link href="/ai" onClick={close} className={cls('/ai')}><Icon name="chat" />New chat</Link></div>
          <div className="flex"><Link href="/library" onClick={close} className={cls('/library')}><Icon name="library" />Library</Link></div>
          <div className="flex"><Link href="/templates" onClick={close} className={cls('/templates')}><Icon name="layout" />Templates</Link></div>
          <div className="flex"><Link href="/todos" onClick={close} aria-current={path === '/todos' ? 'page' : undefined} className={cls('/todos')}><Icon name="listChecks" />To-Do List</Link></div>
        </div>

        {show('shared') && (
          <div>
            <div className={HEAD}>Shared</div>
            <SharePopover key={curPage ?? 'none'} variant="collab" pageId={curPage} choices={shareChoices} userEmail={userEmail} />
          </div>
        )}

        {show('recents') && recents.length > 0 && (
          <div>
            <div className={HEAD}>Recents</div>
            {recents.map(pageLink)}
          </div>
        )}

        {show('favorites') && favorites.length > 0 && (
          <div>
            <div className={HEAD}>Favorites</div>
            {favorites.map((p) => (
              <div key={p.id} className="flex"><Link href={`/pages/${p.id}`} onClick={close} className={cls(`/pages/${p.id}`)}><Icon name="star" className="text-[#d9a400]" /><span className="truncate">{p.title}</span></Link></div>
            ))}
          </div>
        )}

        {show('workspaces') && (
          <div>
            <div className={HEAD}>Workspaces</div>
            {workspaces.length === 0 && <p className="px-2 text-sm text-gray-600">None yet</p>}
            {workspaces.map((w) => (
              <details key={w.id} open className="mb-1">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-1.5 text-[14px] hover:bg-[#ebeae6]">
                  <Link href={`/workspaces/${w.id}`} onClick={close} className={`flex min-w-0 flex-1 items-center gap-2 ${path === `/workspaces/${w.id}` ? 'font-semibold' : 'font-medium'}`}>
                    <Icon name="folder" className="text-[#91918e]" /><span className="truncate">{w.name}</span>
                  </Link>
                  <button
                    type="button"
                    className="ml-2 rounded p-1 text-[#91918e] hover:bg-[#e3e2de] disabled:opacity-50"
                    aria-label={`New page in ${w.name}`}
                    title="New page"
                    disabled={busy === w.id}
                    onClick={(e) => { e.preventDefault(); newPage(w.id); }}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </summary>
                <div className="ml-3 border-l border-[#e9e9e7] pl-1">
                  <div className="flex">
                    <Link href={`/workspaces/${w.id}/tasks`} onClick={close} className={cls(`/workspaces/${w.id}/tasks`)}><Icon name="tasks" className="text-[#91918e]" />Tasks</Link>
                  </div>
                  {w.pages.length === 0 && <p className="px-2 py-1 text-xs text-gray-600">No pages</p>}
                  {branch(tree(w.pages), null, w.id)}
                </div>
              </details>
            ))}
          </div>
        )}

        {show('shared') && shared.length > 0 && (
          <div>
            <div className={HEAD}>Shared with me</div>
            {shared.map(pageLink)}
          </div>
        )}

        <div className="border-t border-[#e9e9e7] pt-2">
          {customize ? (
            <div className="rounded-lg border border-[#e9e9e7] bg-white p-2">
              <div className={HEAD}>Show in sidebar</div>
              <SidebarSections hidden={hidden} compact />
              <button type="button" className="mt-2 w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark" onClick={() => setCustomize(false)}>Done</button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {act('sliders', 'Customize sidebar', () => setCustomize(true))}
              <div className="flex"><Link href="/settings" onClick={close} className={cls('/settings')}><Icon name="user" />Settings</Link></div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
