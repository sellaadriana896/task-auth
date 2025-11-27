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
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

@Entity()
@Index(['listId', 'position'])
@Index(['userId', 'status'])
export class Task {
  @PrimaryGeneratedColumn()
  id!: number; 

  @Column()
  title!: string; 


  @Column({ type: 'text', nullable: true })
  description?: string | null;


  @Column({ type: 'simple-enum', enum: TaskStatus, default: TaskStatus.TODO })
  status!: TaskStatus;


  @Column({ type: 'simple-enum', enum: TaskPriority, default: TaskPriority.NORMAL })
  priority!: TaskPriority;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date | null;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[] | null;

  @Column({ type: 'integer', default: 0 })
  position!: number;

  @Column({ type: 'integer' })
  listId!: number;

  @ManyToOne(() => TaskList, (list) => list.tasks, { onDelete: 'CASCADE' })
  list!: TaskList;

  @Column({ type: 'integer' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}