import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskList } from './entities/task-entities';
import { TasksGateway } from './tasks.gateway';
import { CreateTaskDto, UpdateTaskDto, QueryTasksDto, PutTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private readonly tasksRepo: Repository<Task>,
        @InjectRepository(TaskList)
        private readonly listsRepo: Repository<TaskList>,
        private readonly gateway: TasksGateway,
    ) {}

    async create(dto: CreateTaskDto, userId: number): Promise<Task> {
        let listId: number | null = null;
        if (dto.listId != null) {
            const list = await this.listsRepo.findOne({ where: { id: dto.listId, userId } });
            if (!list) throw new BadRequestException('List not found or not owned by user');
            listId = list.id;
        }
        const task = this.tasksRepo.create({
            title: dto.title,
            description: dto.description ?? null,
            status: dto.status ?? 'todo',
            priority: dto.priority ?? 'normal',
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            userId,
            listId,
        });
        const saved = await this.tasksRepo.save(task);
        this.gateway.emitTaskUpdated({ action: 'patch', task: saved });
        return saved;
    }

    // поиск одной задачи по id и пользователю
    async findById(id: number, userId: number): Promise<Task> {
        const task = await this.tasksRepo.findOne({ where: { id, userId } });
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    async query(
        dto: QueryTasksDto,
        userId: number,
    ): Promise<{ data: Task[]; total: number }> {
        const qb = this.tasksRepo.createQueryBuilder('t');
        qb.where('t.userId = :uid', { uid: userId });

        if (dto.status) {
            qb.andWhere('t.status = :status', { status: dto.status });
        }
        if (dto.priority)
            qb.andWhere('t.priority = :priority', { priority: dto.priority });
        if (dto.search) {
            qb.andWhere('(t.title LIKE :s OR t.description LIKE :s)', {
                s: `%${dto.search}%`,
            });
        }
        if (dto.dueFrom)
            qb.andWhere('t.dueDate >= :dueFrom', { dueFrom: dto.dueFrom });
        if (dto.dueTo) qb.andWhere('t.dueDate <= :dueTo', { dueTo: dto.dueTo });
        if (dto.listId) qb.andWhere('t.listId = :listId', { listId: dto.listId });

        // сортировка
        const allowedSort = new Set([
            'createdAt',
            'updatedAt',
            'dueDate',
            'priority',
            'status',
            'title',
        ]);
        if (dto.sort) {
            const [col, dirRaw] = dto.sort.split(/\s+/);
            const dir = dirRaw?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            if (allowedSort.has(col)) qb.orderBy(`t.${col}`, dir as any);
        } else {
            qb.orderBy('t.createdAt', 'DESC');
        }

        const total = await qb.getCount();
        if (dto.offset) qb.offset(dto.offset);
        if (dto.limit) qb.limit(dto.limit);
        const data = await qb.getMany();
        return { data, total };
    }

    async update(
        id: number,
        dto: UpdateTaskDto,
        userId: number,
    ): Promise<Task> {
        const task = await this.findById(id, userId);
        let changed = false;
        if (dto.title != null) {
            const prev = task.title;
            const normalized = dto.title.trim();
            task.title = normalized;
            if (normalized !== prev) changed = true;
        }
        if (dto.description != null) {
            const normalizedDesc = dto.description.trim();
            task.description = normalizedDesc.length > 0 ? normalizedDesc : null;
            changed = true;
        }
        if (dto.status != null) task.status = dto.status;
        if (dto.status != null) changed = true;
        if (dto.priority != null) task.priority = dto.priority;
        if (dto.priority != null) changed = true;
        if (dto.dueDate !== undefined)
            task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
        if (dto.dueDate !== undefined) changed = true;
        if (dto.listId !== undefined) {
            if (dto.listId === null) {
                task.listId = null;
            } else {
                const list = await this.listsRepo.findOne({ where: { id: dto.listId, userId } });
                if (!list) throw new BadRequestException('List not found or not owned by user');
                task.listId = list.id;
            }
            changed = true;
        }
        // Если после нормализации и проверок никаких изменений не произошло — вернём как есть
        if (!changed) {
            return task;
        }
        const saved = await this.tasksRepo.save(task);
        this.gateway.emitTaskUpdated({ action: 'patch', task: saved });
        return saved;
    }

    async replace(
        id: number,
        dto: PutTaskDto,
        userId: number,
    ): Promise<Task> {
        const existing = await this.findById(id, userId);

        // дефолты

        let listId: number | null = null;
        if (Object.prototype.hasOwnProperty.call(dto, 'listId')) {
            if (dto.listId === null || dto.listId === undefined) {
                listId = null;
            } else {
                const list = await this.listsRepo.findOne({ where: { id: dto.listId, userId } });
                if (!list) throw new BadRequestException('List not found or not owned by user');
                listId = list.id;
            }
        }

        const normalizedTitle = dto.title.trim();
        const normalizedDesc = dto.description != null ? dto.description.trim() : '';

        existing.title = normalizedTitle;
        existing.description = normalizedDesc.length > 0 ? normalizedDesc : null;
        existing.status = dto.status ?? 'todo';
        existing.priority = dto.priority ?? 'normal';
        existing.dueDate = Object.prototype.hasOwnProperty.call(dto, 'dueDate')
            ? dto.dueDate ? new Date(dto.dueDate) : null
            : null;
        existing.listId = Object.prototype.hasOwnProperty.call(dto, 'listId') ? listId : null;

        const saved = await this.tasksRepo.save(existing);
        this.gateway.emitTaskUpdated({ action: 'put', task: saved });
        return saved;
    }

    // отправка события только новому владельцу при переназначении
    async assignToUser(id: number, assigneeUserId: number, currentUserId: number): Promise<Task> {
        const task = await this.findById(id, currentUserId);
        if (task.userId === assigneeUserId) return task;
        task.userId = assigneeUserId;
        task.listId = null;
        const saved = await this.tasksRepo.save(task);
        this.gateway.emitTaskUpdated({ action: 'patch', task: saved });
        return saved;
    }

    async remove(id: number, userId: number): Promise<void> {
        const task = await this.findById(id, userId);
        await this.tasksRepo.remove(task);
    }
}