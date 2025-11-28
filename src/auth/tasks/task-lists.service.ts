import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskList } from './entities/task-entities';
import { CreateListDto, UpdateListDto } from './dto/task-list.dto';

@Injectable()
export class TaskListsService {
  constructor(
    @InjectRepository(TaskList)
    private readonly listsRepo: Repository<TaskList>,
  ) {}

  async create(dto: CreateListDto, userId: number): Promise<TaskList> {
    const list = this.listsRepo.create({ name: dto.name, userId });
    return this.listsRepo.save(list);
  }

  async findById(id: number, userId: number): Promise<TaskList> {
    const list = await this.listsRepo.findOne({ where: { id, userId } });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async findAll(userId: number): Promise<TaskList[]> {
    return this.listsRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async update(id: number, dto: UpdateListDto, userId: number): Promise<TaskList> {
    const list = await this.findById(id, userId);
    if (dto.name != null) list.name = dto.name;
    return this.listsRepo.save(list);
  }

  async remove(id: number, userId: number): Promise<void> {
    const list = await this.findById(id, userId);
    await this.listsRepo.remove(list);
  }
}
