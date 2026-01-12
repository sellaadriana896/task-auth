import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
  PutTaskDto,
} from './dto/task.dto';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';

@UseGuards(JwtCookieGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  async create(@Body() dto: CreateTaskDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    const task = await this.tasks.create(dto, userId);
    return { task }; // обертка для единообразия ответов
  }

  // получить одну задачу по id
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user.id;
    const task = await this.tasks.findById(id, userId);
    return { task };
  }

  // запрос списка задач с фильтрами
  @Get()
  async query(@Query() query: QueryTasksDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    const result = await this.tasks.query(query, userId);
    return result; // data total
  }

  // обновить задачу
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    // если ни одно поле не передано — 400
    const hasAnyField = [
      dto.title,
      dto.description,
      dto.status,
      dto.priority,
      dto.dueDate,
      // listId может быть 0/undefined/null проверка по наличию ключа
      Object.prototype.hasOwnProperty.call(dto, 'listId') ? true : undefined, // линтеры ругаются на такую конструкцию
    ].some((v) => v !== undefined);
    if (!hasAnyField) {
      throw new (await import('@nestjs/common')).BadRequestException(
        'Empty patch: no fields to update',
      );
    }
    const task = await this.tasks.update(id, dto, userId);
    return { task };
  }

  @Put(':id')
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PutTaskDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    const task = await this.tasks.replace(id, dto, userId);
    return { task };
  }

  // удалить задачу
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user.id;
    await this.tasks.remove(id, userId);
    return { success: true };
  }
}
