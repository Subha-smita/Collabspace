import { requireUser } from '@/lib/auth';
import { ensureSeeded, listTodos } from '@/lib/todos';
import TodoList from '@/components/TodoList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'To-Do List' };

export default async function Todos() {
  const u = await requireUser();
  await ensureSeeded(u.id);
  return <TodoList initial={await listTodos(u.id)} />;
}
