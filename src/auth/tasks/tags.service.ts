import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { Task } from './entities/task.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag) private tagRepository: Repository<Tag>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
  ) {}

  async create(name: string, color: string): Promise<Tag> {
    if (!name || name.trim() === '') {
      throw new BadRequestException('Tag name cannot be empty');
    }

    const tag = this.tagRepository.create({
      name: name.trim(),
      color,
    });

    return await this.tagRepository.save(tag);
  }

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async update(
    id: string,
    name?: string,
    color?: string,
  ): Promise<Tag> {
    const tag = await this.findById(id);

    if (name !== undefined) {
      if (name.trim() === '') {
        throw new BadRequestException('Tag name cannot be empty');
      }
      tag.name = name.trim();
    }

    if (color !== undefined) {
      tag.color = color;
    }

    return this.tagRepository.save(tag);
  }

  async delete(id: string): Promise<void> {
    const tag = await this.findById(id);
    await this.tagRepository.remove(tag);
  }

  async addTagToTask(
    tagId: string,
    taskId: string,
  ): Promise<Task> {
    const tag = await this.findById(tagId);

    const task = await this.taskRepository.findOne({
      where: { id: Number(taskId) },
      relations: ['tags'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const tagExists = task.tags.some((t) => t.id === tagId);
    if (tagExists) {
      throw new BadRequestException('Tag already assigned to this task');
    }

    task.tags.push(tag);
    return this.taskRepository.save(task);
  }

  async removeTagFromTask(
    tagId: string,
    taskId: string,
  ): Promise<Task> {
    await this.findById(tagId);

    const task = await this.taskRepository.findOne({
      where: { id: Number(taskId) },
      relations: ['tags'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    task.tags = task.tags.filter((t) => t.id !== tagId);
    return this.taskRepository.save(task);
  }

  async findTasksByTag(tagId: string): Promise<Task[]> {
    await this.findById(tagId);

    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.tags', 'tag')
      .where('tag.id = :tagId', { tagId })
      .orderBy('task.createdAt', 'DESC')
      .getMany();
  }
}
