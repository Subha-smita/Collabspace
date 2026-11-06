'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function call(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}
type Msg = { ok: boolean; text: string } | null;
const Status = ({ m }: { m: Msg }) => (
  <p role="status" aria-live="polite" className={`text-sm ${m?.ok ? 'text-green-800' : 'text-red-700'}`}>{m ? `${m.ok ? '✓ ' : '✕ '}${m.text}` : ''}</p>
);
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-600">{hint}</span>}
  </label>
);

export function ProfileForm({ name: initial, email }: { name: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const { ok, j } = await call('/api/account', 'PATCH', { name });
        setBusy(false);
        setMsg(ok ? { ok, text: 'Name updated' } : { ok, text: j.error ?? 'Failed' });
        if (ok) router.refresh();
      }}
    >
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-semibold text-accent-dark">{(name.trim()[0] ?? '?').toUpperCase()}</span>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{name || 'Your name'}</div>
          <div className="truncate text-sm text-gray-600">{email}</div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" hint="Shown to teammates in comments and sharing.">
          <input className="w-full" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </Field>
        <Field label="Email" hint="Your email can’t be changed.">
          <input className="w-full bg-[#f7f6f3] text-gray-600" value={email} readOnly />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={busy || !name.trim() || name === initial}>{busy ? 'Saving…' : 'Save changes'}</button>
        <Status m={msg} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        if (f.next !== f.confirm) return setMsg({ ok: false, text: 'New passwords do not match' });
        setBusy(true);
        const { ok, j } = await call('/api/account/password', 'POST', { current: f.current, next: f.next });
        setBusy(false);
        setMsg(ok ? { ok, text: 'Password changed' } : { ok, text: j.error ?? 'Failed' });
        if (ok) setF({ current: '', next: '', confirm: '' });
      }}
    >
      <Field label="Current password">
        <input type="password" className="w-full max-w-sm" value={f.current} onChange={set('current')} autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" hint="At least 8 characters.">
          <input type="password" className="w-full" value={f.next} onChange={set('next')} autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm new password">
          <input type="password" className="w-full" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={busy}>{busy ? 'Updating…' : 'Change password'}</button>
        <Status m={msg} />
      </div>
    </form>
  );
}
