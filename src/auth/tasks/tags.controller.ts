import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtCookieGuard } from '../guards/jwt-cookie.guard';
import { TagsService } from './tags.service';

@Controller('tags')
@UseGuards(JwtCookieGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
    async create(
      @Body() createTagDto: { name: string; color?: string },
    ) {
      return this.tagsService.create(createTagDto.name, createTagDto.color || '#808080');
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
    async update(
      @Param('id') id: string,
      @Body() updateTagDto: { name?: string; color?: string },
    ) {
      return this.tagsService.update(
        id,
        updateTagDto.name,
        updateTagDto.color,
      );
    }

  @Delete(':id')
    async delete(@Param('id') id: string) {
      await this.tagsService.delete(id);
      return { message: 'Tag deleted successfully' };
    }

  @Post(':tagId/tasks/:taskId')
    async addTagToTask(
      @Param('tagId') tagId: string,
      @Param('taskId') taskId: string,
    ) {
      return this.tagsService.addTagToTask(tagId, taskId);
    }

  @Delete(':tagId/tasks/:taskId')
    async removeTagFromTask(
      @Param('tagId') tagId: string,
      @Param('taskId') taskId: string,
    ) {
      return this.tagsService.removeTagFromTask(tagId, taskId);
    }

  @Get(':tagId/tasks')
    async findTasksByTag(
      @Param('tagId') tagId: string,
    ) {
      return this.tagsService.findTasksByTag(tagId);
    }
}
