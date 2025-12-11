import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskList } from './entities/task-entities';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskListsService } from './task-lists.service';
import { TaskListsController } from './task-lists.controller';
import { TasksGateway } from './tasks.gateway';
import { AuthModule } from '../auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskList]), AuthModule],
  providers: [TasksService, TaskListsService, TasksGateway],
  controllers: [TasksController, TaskListsController],
  exports: [TypeOrmModule, TasksService, TaskListsService],
})
export class TasksModule {}
