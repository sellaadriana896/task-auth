import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Task } from './task.entity';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 7, default: '#808080' })
  color!: string; // hex color, e.g., #FF5733

  @ManyToMany(() => Task, (task) => task.tags, { onDelete: 'CASCADE' })
  tasks!: Task[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
