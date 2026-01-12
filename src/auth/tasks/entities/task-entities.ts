import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  // Index, // убран: индекс ссылался на отсутствующее поле order
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Task } from './task.entity';

@Entity()
export class TaskList {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  // @Column({ type: 'integer', default: 0})
  // order!: number;

  @Column({ type: 'integer' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  // @OneToMany(() => Task, (task: Task) => task.list)
  // tasks!: Task[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
