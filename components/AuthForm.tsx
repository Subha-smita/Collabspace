'use client';
import Link from 'next/link';
import Logo from './Logo';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const reg = mode === 'register';
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? 'Something went wrong');
    router.push('/start');
    router.refresh();
  }
  return (
    <main className="mx-auto mt-20 w-full max-w-sm px-4">
      <div className="mb-6 flex justify-center"><Logo size={34} /></div>
      <div className="card p-6">
      <h1 className="mb-1 text-xl font-semibold">{reg ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mb-4 text-sm text-gray-600">{reg ? 'Start collaborating with your team.' : 'Log in to continue to Collabspace.'}</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {reg && <input placeholder="Name" value={f.name} onChange={set('name')} required />}
        <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 8 chars)" value={f.password} onChange={set('password')} required minLength={reg ? 8 : 1} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? '…' : reg ? 'Register' : 'Log in'}</button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {reg ? 'Have an account? ' : 'No account? '}
        <Link className="text-accent underline" href={reg ? '/login' : '/register'}>{reg ? 'Log in' : 'Register'}</Link>
      </p>
      </div>
    </main>
  );
}
