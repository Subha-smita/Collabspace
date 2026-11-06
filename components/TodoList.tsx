'use client';
import { useMemo, useState } from 'react';
import Icon from './Icon';
import type { TodoDTO } from '@/lib/todos';

type Draft = { title: string; description: string; dueDate: string };
const EMPTY: Draft = { title: '', description: '', dueDate: '' };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => { const n = new Date(); return iso(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))); };

/** Date-only values are shown in UTC so they never shift by timezone. */
function label(d: string) {
  const t = today(), diff = Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${t}T00:00:00Z`)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const dt = new Date(`${d}T00:00:00Z`);
  return dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: diff > 0 && diff < 7 ? 'long' : undefined, month: 'short', day: 'numeric', year: dt.getUTCFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? 'Something went wrong. Please try again.');
  return j as T;
}

function DueDate({ value, disabled, onChange }: { value: string | null; disabled?: boolean; onChange: (v: string | null) => void }) {
  const overdue = !!value && value < today();
  return (
    <span className="relative inline-flex items-center">
      <label className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-[#ebeae6] ${value ? (overdue ? 'text-red-700' : 'text-[#5f5e5b]') : 'text-[#91918e]'}`}>
        <Icon name="calendar" size={14} />{value ? label(value) : 'No date'}
        <input type="date" aria-label="Due date" disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default" />
      </label>
    </span>
  );
}

function Form({ initial, submitLabel, onSubmit, onCancel }: { initial: Draft; submitLabel: string; onSubmit: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return setErr('Enter a title for the task');
    setBusy(true); setErr('');
    try { await onSubmit(d); } catch (x) { setErr(x instanceof Error ? x.message : 'Could not save'); setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="my-2 space-y-3 rounded-xl border border-[#e3e2de] bg-white p-4 shadow-sm">
      <input autoFocus aria-label="Task title" placeholder="Task title" maxLength={200} value={d.title} onChange={(e) => { setD({ ...d, title: e.target.value }); setErr(''); }} className="w-full text-base font-medium" />
      <textarea aria-label="Description" placeholder="Description (optional)" maxLength={2000} rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className="w-full resize-y rounded-md border border-[#e3e2de] bg-white px-3 py-1.5 text-sm" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">Due date
          <input type="date" value={d.dueDate} onChange={(e) => setD({ ...d, dueDate: e.target.value })} />
          {d.dueDate && <button type="button" className="row-action" onClick={() => setD({ ...d, dueDate: '' })}>Clear</button>}
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        </div>
      </div>
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </form>
  );
}

export default function TodoList({ initial }: { initial: TodoDTO[] }) {
  const [todos, setTodos] = useState(initial);
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [err, setErr] = useState('');

  const pending = useMemo(() => todos.filter((t) => !t.done), [todos]);
  const finished = useMemo(() => todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')), [todos]);
  const list = tab === 'todo' ? pending : finished;

  const replace = (t: TodoDTO) => setTodos((s) => s.map((x) => (x.id === t.id ? t : x)));
  // Optimistic update with rollback if the server rejects it.
  async function patch(t: TodoDTO, body: Partial<Pick<TodoDTO, 'done' | 'dueDate' | 'title' | 'description'>>) {
    setErr('');
    const next = { ...t, ...body, doneAt: body.done === undefined ? t.doneAt : body.done ? new Date().toISOString() : null };
    replace(next);
    try { replace((await api<{ todo: TodoDTO }>(`/api/todos/${t.id}`, 'PATCH', body)).todo); }
    catch (e) { replace(t); setErr(e instanceof Error ? e.message : 'Could not update the task'); }
  }
  async function remove(t: TodoDTO) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    setErr('');
    const prev = todos;
    setTodos((s) => s.filter((x) => x.id !== t.id));
    try { await api(`/api/todos/${t.id}`, 'DELETE'); } catch (e) { setTodos(prev); setErr(e instanceof Error ? e.message : 'Could not delete the task'); }
  }
  async function create(d: Draft) {
    const { todo } = await api<{ todo: TodoDTO }>('/api/todos', 'POST', { title: d.title, description: d.description, dueDate: d.dueDate || null });
    setTodos((s) => [...s, todo]);
    setAdding(false); setTab('todo');
  }
  async function save(t: TodoDTO, d: Draft) {
    const { todo } = await api<{ todo: TodoDTO }>(`/api/todos/${t.id}`, 'PATCH', { title: d.title, description: d.description, dueDate: d.dueDate || null });
    replace(todo); setEditing(null);
  }
  const toggleOpen = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 lg:py-16">
      <Icon name="listChecks" size={64} className="text-[#3d7a5a]" />
      <h1 className="mb-6 mt-4 text-4xl font-bold tracking-tight sm:text-5xl">To-Do List</h1>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#e9e9e7] pb-3">
        <div role="tablist" aria-label="Task views" className="flex gap-1">
          {([['todo', 'To Do', 'listChecks', pending.length], ['done', 'Done', 'check', finished.length]] as const).map(([k, l, ic, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors ${tab === k ? 'bg-[#ebeae6] font-medium text-[#37352f]' : 'text-[#5f5e5b] hover:bg-[#f1f0ee]'}`}>
              <Icon name={ic} size={16} />{l}<span className="text-xs text-[#91918e]">{n}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => { setAdding(true); setTab('todo'); setEditing(null); }}><Icon name="plus" size={14} />New task</button>
      </div>

      {err && <p role="alert" className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {adding && tab === 'todo' && <Form initial={EMPTY} submitLabel="Add task" onSubmit={create} onCancel={() => setAdding(false)} />}

      <ul aria-label={tab === 'todo' ? 'Pending tasks' : 'Completed tasks'}>
        {list.map((t) => (
          <li key={t.id} className="group border-b border-[#f1f0ee]">
            {editing === t.id ? (
              <Form initial={{ title: t.title, description: t.description, dueDate: t.dueDate ?? '' }} submitLabel="Save" onSubmit={(d) => save(t, d)} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex items-center gap-2 py-1.5 transition-colors hover:bg-[#f7f6f3]">
                  <input type="checkbox" checked={t.done} aria-label={t.done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`} onChange={(e) => patch(t, { done: e.target.checked })} className="h-4 w-4 shrink-0 cursor-pointer accent-[#2383e2]" />
                  <button type="button" aria-expanded={open.has(t.id)} onClick={() => toggleOpen(t.id)} className={`min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-[15px] ${t.done ? 'text-[#91918e] line-through' : ''}`} title="Show details">{t.title}</button>
                  <DueDate value={t.dueDate} onChange={(v) => patch(t, { dueDate: v })} />
                  <span className="flex shrink-0 items-center opacity-100 transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                    <button type="button" aria-label={`Edit "${t.title}"`} title="Edit" className="rounded p-1.5 text-[#91918e] hover:bg-[#ebeae6] hover:text-[#37352f]" onClick={() => { setEditing(t.id); setAdding(false); }}><Icon name="pencil" size={14} /></button>
                    <button type="button" aria-label={`Delete "${t.title}"`} title="Delete" className="rounded p-1.5 text-[#91918e] hover:bg-red-50 hover:text-red-700" onClick={() => remove(t)}><Icon name="trash" size={14} /></button>
                  </span>
                </div>
                {open.has(t.id) && <p className="pb-3 pl-9 pr-4 text-sm text-gray-600">{t.description || 'No description yet. Use the pencil icon to add one.'}</p>}
              </>
            )}
          </li>
        ))}
      </ul>

      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#d3d2ce] px-6 py-12 text-center">
          <Icon name={tab === 'todo' ? 'listChecks' : 'check'} size={28} className="mx-auto text-[#91918e]" />
          <p className="mt-3 text-lg font-medium">{tab === 'todo' ? (todos.length ? 'All caught up' : 'No tasks yet') : 'Nothing finished yet'}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">{tab === 'todo' ? (todos.length ? 'Everything is done. Add a new task whenever you are ready.' : 'Click New task to add your first one.') : 'Tasks you check off in To Do will appear here.'}</p>
        </div>
      )}
      {tab === 'todo' && !adding && list.length > 0 && (
        <button type="button" onClick={() => setAdding(true)} className="mt-1 flex w-full items-center gap-2 rounded-md px-1 py-2 text-sm text-[#91918e] transition-colors hover:bg-[#f7f6f3] hover:text-[#37352f]"><Icon name="plus" size={14} />New task</button>
      )}
    </main>
  );
}
