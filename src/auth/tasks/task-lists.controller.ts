import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateListDto, UpdateListDto } from './dto/task-list.dto';
import { TaskListsService } from './task-lists.service';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';

@UseGuards(JwtCookieGuard)
@Controller('task-lists')
export class TaskListsController {
  constructor(private readonly lists: TaskListsService) {}

  @Post()
  async create(@Body() dto: CreateListDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    const list = await this.lists.create(dto, userId);
    return { list };
  }

  @Get()
  async all(@Req() req: Request) {
    const userId = (req as any).user.id;
    const lists = await this.lists.findAll(userId);
    return { lists };
  }

  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user.id;
    const list = await this.lists.findById(id, userId);
    return { list };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateListDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    const list = await this.lists.update(id, dto, userId);
    return { list };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user.id;
    await this.lists.remove(id, userId);
    return { success: true };
  }
}
