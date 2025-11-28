import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TaskList } from './task-entities';
import { User } from '../../../users/user.entity';
import { TASK_STATUS, type TaskStatus } from '../enums/task-status.enum';
import { TASK_PRIORITY, type TaskPriority } from '../enums/task-priority.enum';

@Entity()
@Index(['userId', 'status'])
@Index(['userId', 'listId'])
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'simple-enum', enum: TASK_STATUS, default: 'todo' })
  status!: TaskStatus;

  @Column({ type: 'simple-enum', enum: TASK_PRIORITY, default: 'normal' })
  priority!: TaskPriority;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date | null;

  @Column({ type: 'integer' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'integer', nullable: true })
  listId?: number | null;

  @ManyToOne(() => TaskList, { onDelete: 'SET NULL', nullable: true })
  list?: TaskList | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}