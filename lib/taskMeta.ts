export const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETE'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = { TODO: 'To-do', IN_PROGRESS: 'In progress', IN_REVIEW: 'In review', COMPLETE: 'Complete' };
export const PRIORITY_LABEL: Record<(typeof PRIORITIES)[number], string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };