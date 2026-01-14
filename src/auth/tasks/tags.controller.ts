import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async create(@Body() dto: { name: string; color?: string }) {
    return this.tagsService.create(dto.name, dto.color || '#808080');
  }

  @Get()
  async findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tagsService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: { name?: string; color?: string }) {
    return this.tagsService.update(id, dto.name, dto.color);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.tagsService.delete(id);
    return { message: 'Tag deleted successfully' };
  }

  @Post(':tagId/tasks/:taskId')
  async addTagToTask(@Param('tagId') tagId: string, @Param('taskId') taskId: string) {
    return this.tagsService.addTagToTask(tagId, taskId);
  }

  @Delete(':tagId/tasks/:taskId')
  async removeTagFromTask(@Param('tagId') tagId: string, @Param('taskId') taskId: string) {
    return this.tagsService.removeTagFromTask(tagId, taskId);
  }

  @Get(':tagId/tasks')
  async findTasksByTag(@Param('tagId') tagId: string) {
    return this.tagsService.findTasksByTag(tagId);
  }
}
