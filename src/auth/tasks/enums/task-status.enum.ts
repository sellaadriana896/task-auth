export const TASK_STATUS = ['todo', 'in_progress', 'done', 'blocked'] as const;

export type TaskStatus = (typeof TASK_STATUS)[number];
export const TaskStatusValues = TASK_STATUS;
