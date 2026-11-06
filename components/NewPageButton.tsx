'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewPageButton({ workspaceId }: { workspaceId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cls = 'rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50';
  if (!workspaceId) return <Link href="/dashboard" className={cls}>Create workspace</Link>;
  return (
    <button
      type="button"
      className={cls}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch(`/api/workspaces/${workspaceId}/pages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled' }),
        });
        const j = await r.json().catch(() => ({}));
        setBusy(false);
        if (!r.ok) return alert(j.error ?? 'Failed to create page');
        router.push(`/pages/${j.id}`);
        router.refresh();
      }}
    >
      New page
    </button>
  );
}
