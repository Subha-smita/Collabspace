import { z } from 'zod';
import { PRIORITIES, STATUSES } from './taskMeta';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const TaskCreate = z.object({
  title: z.string().trim().min(1).max(200),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: day.nullable().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
});
export const TaskUpdate = TaskCreate.partial();
export const toDate = (d?: string | null) => (d === undefined ? undefined : d === null ? null : new Date(`${d}T00:00:00.000Z`));