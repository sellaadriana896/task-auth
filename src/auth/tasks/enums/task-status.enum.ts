export enum TaskStatus { 
    TODO = 'todo',
    IN_PROGRESS = 'in_progress',
    DONE = 'done',
    BLOCKED = 'blocked',
}

export const TaskStatusValues: TaskStatus[] = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.DONE,
    TaskStatus.BLOCKED,
]