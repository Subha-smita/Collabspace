'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

export function ActionForm(p: {
  url: string; name: string; placeholder: string; button: string;
  method?: string; type?: string; defaultValue?: string; keep?: boolean; gotoPrefix?: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(p.defaultValue ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        const { ok, j } = await call(p.url, p.method ?? 'POST', { [p.name]: v });
        setBusy(false);
        if (!ok) return setErr(j.error ?? 'Failed');
        if (!p.keep) setV('');
        if (p.gotoPrefix) { router.push(`${p.gotoPrefix}/${j.id}`); router.refresh(); }
        else router.refresh();
      }}
    >
      <input type={p.type ?? 'text'} className="w-64 max-w-full" value={v} onChange={(e) => setV(e.target.value)} placeholder={p.placeholder} required />
      <button className="btn" disabled={busy}>{p.button}</button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </form>
  );
}

export function ActionButton(p: { url: string; label: string; method?: string; confirmText?: string; goto?: string; variant?: 'row' | 'outline' }) {
  const router = useRouter();
  return (
    <button
      className={p.variant === 'outline' ? 'btn-danger' : 'row-action-danger'}
      onClick={async () => {
        if (p.confirmText && !confirm(p.confirmText)) return;
        const { ok, j } = await call(p.url, p.method ?? 'DELETE');
        if (!ok) return alert(j.error ?? 'Failed');
        if (p.goto) { router.push(p.goto); router.refresh(); }
        else router.refresh();
      }}
    >
      {p.label}
    </button>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-secondary !px-3 !py-1"
      onClick={async () => {
        await call('/api/auth/logout', 'POST');
        router.push('/login');
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
