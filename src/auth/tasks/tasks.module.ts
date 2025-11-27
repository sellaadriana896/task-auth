import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskList } from './entities/task-entities';

@Module({
    imports: [TypeOrmModule.forFeature([Task, TaskList])],
    exports: [TypeOrmModule],
})
export class TasksModule {}