import { IsOptional, IsString, Length, IsDateString, IsInt, Min, IsIn } from 'class-validator';
import { TASK_STATUS, type TaskStatus } from '../enums/task-status.enum';
import { TASK_PRIORITY, type TaskPriority } from '../enums/task-priority.enum';

export class CreateTaskDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(TASK_STATUS)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_PRIORITY)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  listId?: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(TASK_STATUS)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_PRIORITY)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  listId?: number;
}

export class QueryTasksDto {
  @IsOptional()
  @IsIn(TASK_STATUS)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_PRIORITY)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  listId?: number;
}
