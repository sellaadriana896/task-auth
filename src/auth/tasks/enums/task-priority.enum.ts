export const TASK_PRIORITY = [
    'low',
    'normal',
    'high',
    'urgent',
] as const;

export type TaskPriority = typeof TASK_PRIORITY[number];

export const TaskPriorityValues = TASK_PRIORITY;