'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_LABEL, type Role } from '@/lib/roles';

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}
const options = (isOwner: boolean): Role[] => (isOwner ? ['ADMIN', 'MEMBER', 'VIEWER'] : ['MEMBER', 'VIEWER']);

export function AddMember({ workspaceId, isOwner }: { workspaceId: string; isOwner: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        const { ok, j } = await call(`/api/workspaces/${workspaceId}/members`, 'POST', { email, role });
        setBusy(false);
        if (!ok) return setErr(j.error ?? 'Failed');
        setEmail('');
        router.refresh();
      }}
    >
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite by email (registered user)" required />
      <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Role">
        {options(isOwner).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
      <button className="btn" disabled={busy}>Add member</button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </form>
  );
}

export function RoleSelect({ workspaceId, userId, role, isOwner }: { workspaceId: string; userId: string; role: Role; isOwner: boolean }) {
  const router = useRouter();
  return (
    <select
      value={role}
      aria-label="Member role"
      onChange={async (e) => {
        const { ok, j } = await call(`/api/workspaces/${workspaceId}/members`, 'PATCH', { userId, role: e.target.value });
        if (!ok) alert(j.error ?? 'Failed');
        router.refresh();
      }}
    >
      {options(isOwner).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
    </select>
  );
}