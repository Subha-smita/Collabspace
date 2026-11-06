'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '@/lib/taskMeta';

type Status = (typeof STATUSES)[number];
type Priority = (typeof PRIORITIES)[number];
export type TaskView = { id: string; title: string; status: Status; priority: Priority; dueDate: string | null; assigneeId: string | null; createdById: string | null };
type Member = { id: string; name: string };
type Change = Partial<Pick<TaskView, 'title' | 'status' | 'priority' | 'dueDate' | 'assigneeId'>>;

const TINT: Record<Status, string> = { TODO: 'bg-[#f1f0ee]', IN_PROGRESS: 'bg-sand', IN_REVIEW: 'bg-accent-soft', COMPLETE: 'bg-sage' };

async function send(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

export default function TaskBoard({ workspaceId, tasks: initial, members, userId, canWrite, isAdmin }: {
  workspaceId: string; tasks: TaskView[]; members: Member[]; userId: string; canWrite: boolean; isAdmin: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [mine, setMine] = useState(false);
  const [adding, setAdding] = useState<Status | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { setTasks(initial); }, [initial]);

  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;
  const today = new Date().toISOString().slice(0, 10);
  const visible = mine ? tasks.filter((t) => t.assigneeId === userId) : tasks;

  async function patch(id: string, body: Change) {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...body } : t)));
    const { ok, j } = await send(`/api/tasks/${id}`, 'PATCH', body);
    if (!ok) { setTasks(prev); alert(j.error ?? 'Failed to update task'); return; }
    router.refresh();
  }
  async function add(status: Status) {
    const title = draft.trim();
    if (!title) return;
    const { ok, j } = await send(`/api/workspaces/${workspaceId}/tasks`, 'POST', { title, status });
    if (!ok) return alert(j.error ?? 'Failed to create task');
    setDraft('');
    setAdding(null);
    router.refresh();
  }
  async function remove(t: TaskView) {
    const { ok, j } = await send(`/api/tasks/${t.id}`, 'DELETE');
    if (!ok) return alert(j.error ?? 'Failed to delete task');
    setEditing(null);
    router.refresh();
  }

  const card = (t: TaskView) => {
    const open = editing === t.id;
    const overdue = !!t.dueDate && t.status !== 'COMPLETE' && t.dueDate < today;
    const canDelete = isAdmin || t.createdById === userId;
    return (
      <div key={t.id} className="rounded border border-[#e9e9e7] bg-white p-2 text-sm shadow-sm">
        <div draggable={canWrite} onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}>
          <button type="button" className="block w-full text-left" disabled={!canWrite} aria-expanded={open} onClick={() => setEditing(open ? null : t.id)}>
            <div className={t.status === 'COMPLETE' ? 'text-gray-500 line-through' : ''}>{t.title}</div>
            <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-500">
              <span>{PRIORITY_LABEL[t.priority]}</span>
              {nameOf(t.assigneeId) && <span>{nameOf(t.assigneeId)}</span>}
              {t.dueDate && <span className={overdue ? 'text-red-700' : ''}>{overdue ? 'Overdue · ' : 'Due '}{t.dueDate}</span>}
            </div>
          </button>
        </div>
        {open && (
          <div className="mt-2 space-y-2 border-t pt-2">
            <input
              className="w-full"
              defaultValue={t.title}
              aria-label="Task title"
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.title) patch(t.id, { title: v }); }}
            />
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
              <input type="date" value={t.dueDate ?? ''} aria-label="Due date" onChange={(e) => patch(t.id, { dueDate: e.target.value || null })} />
            </div>
            {canDelete && <button type="button" className="text-red-600 hover:underline" onClick={() => remove(t)}>Delete task</button>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {([false, true] as const).map((m) => (
          <button key={String(m)} type="button" onClick={() => setMine(m)} className={`rounded px-3 py-1 ${mine === m ? 'bg-accent-soft font-medium text-accent-dark' : 'hover:bg-[#ebeae6]'}`}>
            {m ? 'My tasks' : 'All tasks'}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => {
          const col = visible.filter((t) => t.status === s);
          return (
            <section
              key={s}
              className={`rounded p-2 ${TINT[s]}`}
              onDragOver={(e) => { if (canWrite) e.preventDefault(); }}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/plain');
                const t = tasks.find((x) => x.id === id);
                if (canWrite && t && t.status !== s) patch(id, { status: s });
              }}
            >
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
                {STATUS_LABEL[s]} <span className="text-xs font-normal text-gray-500">{col.length}</span>
              </h2>
              <div className="space-y-2">{col.map(card)}</div>
              {canWrite && (adding === s ? (
                <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(s); }}>
                  <input className="min-w-0 flex-1" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Task title" aria-label="New task title" />
                  <button className="btn">Add</button>
                </form>
              ) : (
                <button type="button" className="mt-2 w-full rounded px-2 py-1 text-left text-sm text-gray-500 hover:bg-[#ebeae6]" onClick={() => { setAdding(s); setDraft(''); }}>
                  + New task
                </button>
              ))}
            </section>
          );
        })}
      </div>
      {!canWrite && <p className="text-sm text-gray-500">You have view-only access to this board.</p>}
    </div>
  );
}