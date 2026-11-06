'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '@/lib/taskMeta';
import type { TaskView } from './TaskBoard';

type Status = (typeof STATUSES)[number];
type Priority = (typeof PRIORITIES)[number];
type Member = { id: string; name: string };
type Change = Partial<Pick<TaskView, 'title' | 'status' | 'priority' | 'dueDate' | 'assigneeId'>>;

async function send(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

// Computed after mount so server and browser agree (no hydration mismatch).
function dueLabel(d: string, today: string | null) {
  if (!today) return d;
  const diff = Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function TaskList({ workspaceId, tasks: initial, members, userId, canWrite, isAdmin }: {
  workspaceId: string; tasks: TaskView[]; members: Member[]; userId: string; canWrite: boolean; isAdmin: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [q, setQ] = useState<string | null>(null); // null = search closed
  const [sort, setSort] = useState<'created' | 'due'>('created');
  const [open, setOpen] = useState<string | null>(null);
  const [dateEdit, setDateEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [today, setToday] = useState<string | null>(null);
  const newRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTasks(initial); }, [initial]);
  useEffect(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    setToday(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  }, []);

  const rows = useMemo(() => {
    let r = tasks.filter((t) => (tab === 'done' ? t.status === 'COMPLETE' : t.status !== 'COMPLETE'));
    if (q) r = r.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
    if (sort === 'due') r = [...r].sort((a, b) => (a.dueDate ?? '9999') .localeCompare(b.dueDate ?? '9999'));
    return r;
  }, [tasks, tab, q, sort]);
  const counts = { todo: tasks.filter((t) => t.status !== 'COMPLETE').length, done: tasks.filter((t) => t.status === 'COMPLETE').length };

  async function patch(id: string, body: Change) {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...body } : t)));
    const { ok, j } = await send(`/api/tasks/${id}`, 'PATCH', body);
    if (!ok) { setTasks(prev); alert(j.error ?? 'Failed to update task'); return; }
    router.refresh();
  }
  async function add() {
    const title = draft.trim();
    if (!title) return;
    const { ok, j } = await send(`/api/workspaces/${workspaceId}/tasks`, 'POST', { title });
    if (!ok) return alert(j.error ?? 'Failed to create task');
    setDraft('');
    router.refresh();
    newRef.current?.focus();
  }
  async function remove(t: TaskView) {
    const { ok, j } = await send(`/api/tasks/${t.id}`, 'DELETE');
    if (!ok) return alert(j.error ?? 'Failed to delete task');
    setOpen(null);
    router.refresh();
  }
  const startAdd = () => { setTab('todo'); setAdding(true); setTimeout(() => newRef.current?.focus(), 0); };

  const tabCls = (on: boolean) => `rounded-md px-3 py-1.5 text-sm ${on ? 'bg-[#ebeae6] font-medium' : 'text-gray-600 hover:bg-[#f1f0ee]'}`;
  const iconBtn = 'rounded p-1.5 text-sm text-gray-500 hover:bg-[#ebeae6]';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="tablist">
          <button role="tab" aria-selected={tab === 'todo'} className={tabCls(tab === 'todo')} onClick={() => setTab('todo')}>☰ To Do <span className="text-xs text-gray-500">{counts.todo}</span></button>
          <button role="tab" aria-selected={tab === 'done'} className={tabCls(tab === 'done')} onClick={() => setTab('done')}>☑ Done <span className="text-xs text-gray-500">{counts.done}</span></button>
        </div>
        <div className="flex items-center gap-1">
          {q !== null && (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQ(null)} placeholder="Search tasks…" aria-label="Search tasks" className="w-44" />
          )}
          <button type="button" className={iconBtn} title={`Sort: ${sort === 'created' ? 'created' : 'due date'} (click to change)`} onClick={() => setSort(sort === 'created' ? 'due' : 'created')}>
            ⇅ <span className="text-xs">{sort === 'created' ? 'Created' : 'Due date'}</span>
          </button>
          <button type="button" className={iconBtn} title="Search" aria-label="Search" onClick={() => setQ(q === null ? '' : null)}>🔍</button>
          {canWrite && <button type="button" className="ml-1 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark" onClick={startAdd}>New</button>}
        </div>
      </div>

      <ul className="mt-3">
        {rows.length === 0 && !adding && <li className="px-2 py-6 text-sm text-gray-500">{q ? 'No matching tasks.' : tab === 'done' ? 'Nothing finished yet.' : 'All caught up.'}</li>}
        {rows.map((t) => {
          const done = t.status === 'COMPLETE';
          const diff = t.dueDate && today ? Math.round((Date.parse(t.dueDate) - Date.parse(today)) / 86_400_000) : 0;
          const overdue = !!t.dueDate && !done && diff < 0;
          const canDelete = isAdmin || t.createdById === userId;
          const expanded = open === t.id;
          return (
            <li key={t.id} className="border-b border-transparent hover:bg-[#f7f6f3]">
              <div className="flex items-center gap-3 px-2 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[#2f6fa3]"
                  checked={done}
                  disabled={!canWrite}
                  aria-label={done ? `Mark "${t.title}" as to do` : `Mark "${t.title}" as done`}
                  onChange={() => patch(t.id, { status: done ? 'TODO' : 'COMPLETE' })}
                />
                <button type="button" className={`min-w-0 flex-1 truncate text-left text-[15px] ${done ? 'text-gray-500 line-through' : ''}`} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : t.id)}>
                  {t.title}
                </button>
                {!done && t.status !== 'TODO' && <span className="shrink-0 rounded bg-[#ebeae6] px-1.5 py-0.5 text-xs text-gray-600">{STATUS_LABEL[t.status]}</span>}
                {dateEdit === t.id ? (
                  <input type="date" autoFocus value={t.dueDate ?? ''} aria-label="Due date" onBlur={() => setDateEdit(null)} onChange={(e) => { patch(t.id, { dueDate: e.target.value || null }); setDateEdit(null); }} />
                ) : (
                  <button type="button" disabled={!canWrite} className={`w-24 shrink-0 text-right text-sm ${overdue ? 'text-red-700' : 'text-gray-700'} ${canWrite ? 'hover:underline' : ''}`} title="Change due date" onClick={() => setDateEdit(t.id)}>
                    {t.dueDate ? dueLabel(t.dueDate, today) : <span className="text-gray-400">No date</span>}
                  </button>
                )}
              </div>
              {expanded && canWrite && (
                <div className="space-y-2 border-t border-[#e9e9e7] bg-white px-9 py-3">
                  <input className="w-full" defaultValue={t.title} aria-label="Task title" onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.title) patch(t.id, { title: v }); }} />
                  <div className="flex flex-wrap gap-2">
                    <select value={t.status} aria-label="Status" onChange={(e) => patch(t.id, { status: e.target.value as Status })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <select value={t.priority} aria-label="Priority" onChange={(e) => patch(t.id, { priority: e.target.value as Priority })}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                    </select>
                    <select value={t.assigneeId ?? ''} aria-label="Assignee" onChange={(e) => patch(t.id, { assigneeId: e.target.value || null })}>
                      <option value="">Unassigned</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  {canDelete && <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => remove(t)}>Delete task</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {canWrite && tab === 'todo' && (
        adding ? (
          <form className="flex items-center gap-3 px-2 py-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <span className="h-4 w-4 shrink-0 rounded border border-[#c9c8c4]" aria-hidden />
            <input ref={newRef} className="min-w-0 flex-1 border-0 bg-transparent px-0 text-[15px] focus:ring-0" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => !draft.trim() && setAdding(false)} onKeyDown={(e) => e.key === 'Escape' && setAdding(false)} placeholder="Task name — press Enter to add" aria-label="New task title" />
          </form>
        ) : (
          <button type="button" className="flex w-full items-center gap-3 rounded px-2 py-2 text-left text-sm text-gray-500 hover:bg-[#f7f6f3]" onClick={startAdd}>
            <span className="w-4 text-center">+</span> New task
          </button>
        )
      )}
      {!canWrite && <p className="mt-3 text-sm text-gray-500">You have view-only access to these tasks.</p>}
    </div>
  );
}
