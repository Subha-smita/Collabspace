'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type Item = { id: string; message: string; read: boolean; createdAt: string; href: string };

export default function UpdatesList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  async function mark(body: { ids?: string[]; all?: boolean; read: boolean }) {
    setBusy(true);
    const r = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) return alert('Could not update notifications');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{unread} unread</span>
        <button className="text-accent hover:underline disabled:opacity-50" disabled={busy || !unread} onClick={() => mark({ all: true, read: true })}>
          Mark all as read
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-center text-gray-600">✓ You’re all caught up. Mentions, replies and workspace invitations show up here.</p>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {items.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 p-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={async () => { if (!n.read) await mark({ ids: [n.id], read: true }); router.push(n.href); }}
              >
                <span className={`block ${n.read ? 'text-gray-700' : 'font-semibold'}`}>
                  {!n.read && <span className="mr-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-dark">New</span>}
                  {n.message}
                </span>
                <time suppressHydrationWarning className="block text-xs text-gray-600">{new Date(n.createdAt).toLocaleString()}</time>
              </button>
              <button className="shrink-0 text-xs text-accent hover:underline disabled:opacity-50" disabled={busy} onClick={() => mark({ ids: [n.id], read: !n.read })}>
                {n.read ? 'Mark unread' : 'Mark read'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}