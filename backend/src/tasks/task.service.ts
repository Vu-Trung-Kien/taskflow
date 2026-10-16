import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async list(projectId: string, userId: string, query: ListTasksDto) {
    const membership = await this.access.requireMembership(projectId, userId);
    const includeDeleted = query.includeDeleted === 'true';
    if (includeDeleted && membership.role === ProjectRole.VIEWER) {
      throw new ForbiddenException('Only project editors can view deleted tasks.');
    }

    return this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: includeDeleted ? { not: null } : null,
        status: query.status,
        priority: query.priority,
      },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async get(projectId: string, taskId: string, userId: string) {
    await this.access.requireMembership(projectId, userId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        subTasks: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, email: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found.');
    }
    return task;
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ) {
    await this.access.requireEditor(projectId, userId);
    await this.access.requireActiveProject(projectId);
    if (dto.parentTaskId) {
      const parent = await this.prisma.task.findFirst({
        where: {
          id: dto.parentTaskId,
          projectId,
          parentTaskId: null,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!parent) {
        throw new BadRequestException(
          'A sub-task must reference an active top-level task in the same project.',
        );
      }
    }
    if (dto.assigneeId) {
      await this.requireProjectAssignee(projectId, dto.assigneeId);
    }

    return this.prisma.task.create({
      data: {
        projectId,
        createdById: userId,
        parentTaskId: dto.parentTaskId,
        assigneeId: dto.assigneeId,
        title: dto.title,
        description: dto.description || null,
        status: dto.status,
        priority: dto.priority,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async update(
    projectId: string,
    taskId: string,
    userId: string,
    dto: UpdateTaskDto,
  ) {
    await this.access.requireEditor(projectId, userId);
    await this.access.requireActiveProject(projectId);
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('At least one task field must be supplied.');
    }
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found.');
    }
    if (dto.assigneeId) {
      await this.requireProjectAssignee(projectId, dto.assigneeId);
    }

    const data: Prisma.TaskUncheckedUpdateManyInput = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      assigneeId: dto.assigneeId,
      dueAt:
        dto.dueAt === undefined
          ? undefined
          : dto.dueAt === null
            ? null
            : new Date(dto.dueAt),
    };
    const updated = await this.prisma.task.updateMany({
      where: { id: taskId, projectId, deletedAt: null },
      data,
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Task not found.');
    }
    return this.get(projectId, taskId, userId);
  }

  async softDelete(projectId: string, taskId: string, userId: string) {
    await this.access.requireEditor(projectId, userId);
    await this.access.requireActiveProject(projectId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      select: { id: true, parentTaskId: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    const deletedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      if (task.parentTaskId === null) {
        await transaction.task.updateMany({
          where: { projectId, parentTaskId: taskId, deletedAt: null },
          data: { deletedAt },
        });
      }
      await transaction.task.update({
        where: { id: taskId },
        data: { deletedAt },
      });
    });
    return { deleted: true };
  }

  async restore(projectId: string, taskId: string, userId: string) {
    await this.access.requireEditor(projectId, userId);
    await this.access.requireActiveProject(projectId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: { not: null } },
      select: { id: true, parentTaskId: true },
    });
    if (!task) {
      throw new NotFoundException('Deleted task not found.');
    }
    if (task.parentTaskId) {
      const parent = await this.prisma.task.findFirst({
        where: {
          id: task.parentTaskId,
          projectId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!parent) {
        throw new ConflictException('Restore the parent task before its sub-task.');
      }
    }
    return this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: null },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
      },
    });
  }

  private async requireProjectAssignee(
    projectId: string,
    assigneeId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: assigneeId },
      },
      select: { userId: true },
    });
    if (!membership) {
      throw new BadRequestException('Assignee must be a member of this project.');
    }
  }
}
