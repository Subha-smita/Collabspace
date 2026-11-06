import { z } from 'zod';
import { prisma } from './prisma';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Invalid date');
export const TodoCreate = z.object({ title: z.string().trim().min(1, 'Title is required').max(200), description: z.string().trim().max(2000).optional(), dueDate: day.nullable().optional() });
export const TodoUpdate = TodoCreate.partial().extend({ done: z.boolean().optional() }).refine((v) => Object.values(v).some((x) => x !== undefined), 'Nothing to update');
export const toDay = (d?: string | null) => (d === undefined ? undefined : d === null ? null : new Date(`${d}T00:00:00.000Z`));

export type TodoDTO = { id: string; title: string; description: string; dueDate: string | null; done: boolean; doneAt: string | null; createdAt: string };
export const MAX_TODOS = 500;

type Row = { id: string; title: string; description: string; dueDate: Date | null; done: boolean; doneAt: Date | null; createdAt: Date };
export const toDTO = (t: Row): TodoDTO => ({ id: t.id, title: t.title, description: t.description, dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null, done: t.done, doneAt: t.doneAt?.toISOString() ?? null, createdAt: t.createdAt.toISOString() });

const EXAMPLES: { title: string; description: string; in: number }[] = [
  { title: 'Check the box to mark items as done', description: 'Click the checkbox on the left. The task moves to the Done tab. Uncheck it there to bring it back.', in: 0 },
  { title: 'Click the due date to change it', description: 'Every task can have a due date. Click the date on the right of a task to pick another one, or clear it.', in: 1 },
  { title: 'Click me to see even more detail', description: 'This is the task description. Use the pencil icon to edit the title, description and due date together.', in: 2 },
  { title: 'Click the blue New task button to add a task', description: 'Enter a title, then optionally a description and a due date, and press Add task.', in: 3 },
  { title: 'Click me to learn how to hide checked items', description: 'Checked items leave the To Do tab automatically, so your list only shows what is still pending.', in: 4 },
  { title: 'See finished items in the "Done" view', description: 'Switch to the Done tab to see everything you have completed. You can delete finished tasks there.', in: 5 },
  { title: 'Click me to learn how to see your content your way', description: 'Use the trash icon to delete tasks you no longer need, including these examples. They will not come back.', in: 6 },
];

/** Creates the example tasks exactly once per user. The conditional update acts as a lock, so concurrent requests cannot double-seed. */
export async function ensureSeeded(userId: string) {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  await prisma.$transaction(async (tx) => {
    const r = await tx.user.updateMany({ where: { id: userId, todosSeededAt: null }, data: { todosSeededAt: new Date() } });
    if (r.count !== 1) return;
    await tx.todo.createMany({ data: EXAMPLES.map((e, i) => ({ userId, title: e.title, description: e.description, sortOrder: i, dueDate: new Date(today.getTime() + e.in * 86_400_000) })) });
  });
}

export const listTodos = async (userId: string) =>
  (await prisma.todo.findMany({ where: { userId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })).map(toDTO);
