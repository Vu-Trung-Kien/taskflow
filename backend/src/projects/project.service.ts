import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole, TaskPriority, TaskStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { TransferProjectOwnerDto } from './dto/transfer-project-owner.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        createdById: userId,
        members: {
          create: { userId, role: ProjectRole.OWNER },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  async list(userId: string, includeArchived: boolean) {
    return this.prisma.project.findMany({
      where: {
        members: { some: { userId } },
        archivedAt: includeArchived ? undefined : null,
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(projectId: string, userId: string) {
    await this.access.requireMembership(projectId, userId);
    return this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    await this.access.requireOwner(projectId, userId);
    await this.access.requireActiveProject(projectId);
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('At least one project field must be supplied.');
    }
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        description: dto.description === undefined ? undefined : dto.description,
      },
    });
  }

  async archive(projectId: string, userId: string) {
    await this.access.requireOwner(projectId, userId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date() },
    });
  }

  async restore(projectId: string, userId: string) {
    await this.access.requireOwner(projectId, userId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: null },
    });
  }

  async listMembers(projectId: string, userId: string) {
    await this.access.requireMembership(projectId, userId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(
    projectId: string,
    userId: string,
    dto: AddProjectMemberDto,
  ) {
    await this.access.requireOwner(projectId, userId);
    await this.access.requireActiveProject(projectId);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Registered user not found.');
    }

    try {
      return await this.prisma.projectMember.create({
        data: { projectId, userId: user.id, role: dto.role },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User is already a project member.');
      }
      throw error;
    }
  }

  async updateMember(
    projectId: string,
    userId: string,
    memberId: string,
    dto: UpdateProjectMemberDto,
  ) {
    await this.access.requireOwner(projectId, userId);
    await this.access.requireActiveProject(projectId);
    const target = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
    });
    if (!target) {
      throw new NotFoundException('Project member not found.');
    }
    if (target.role === ProjectRole.OWNER) {
      throw new ConflictException('Transfer project ownership instead.');
    }
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: memberId } },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async removeMember(projectId: string, userId: string, memberId: string) {
    await this.access.requireOwner(projectId, userId);
    await this.access.requireActiveProject(projectId);
    if (userId === memberId) {
      throw new ConflictException('Transfer ownership before leaving the project.');
    }

    const target = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
    });
    if (!target) {
      throw new NotFoundException('Project member not found.');
    }
    if (target.role === ProjectRole.OWNER) {
      throw new ConflictException('The project owner cannot be removed.');
    }

    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { projectId, assigneeId: memberId },
        data: { assigneeId: null },
      }),
      this.prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId: memberId } },
      }),
    ]);
    return { removed: true };
  }

  async transferOwner(
    projectId: string,
    userId: string,
    dto: TransferProjectOwnerDto,
  ) {
    await this.access.requireOwner(projectId, userId);
    await this.access.requireActiveProject(projectId);
    if (userId === dto.userId) {
      throw new ConflictException('User is already the project owner.');
    }

    const target = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (!target) {
      throw new NotFoundException('New owner must already be a project member.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.projectMember.update({
        where: { projectId_userId: { projectId, userId } },
        data: { role: ProjectRole.MEMBER },
      });
      await transaction.projectMember.update({
        where: {
          projectId_userId: { projectId, userId: dto.userId },
        },
        data: { role: ProjectRole.OWNER },
      });
    });
    return this.listMembers(projectId, userId);
  }

  async getMetrics(projectId: string, userId: string) {
    await this.access.requireMembership(projectId, userId);

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      activeTasks,
      statusGroups,
      priorityGroups,
      overdueCount,
      dueSoonCount,
      members,
      memberTaskGroups,
      memberOverdueGroups,
      totalComments,
      totalAttachments,
    ] = await Promise.all([
      this.prisma.task.count({
        where: { projectId, deletedAt: null },
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { projectId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { projectId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.task.count({
        where: {
          projectId,
          deletedAt: null,
          status: { not: TaskStatus.DONE },
          dueAt: { lt: now },
        },
      }),
      this.prisma.task.count({
        where: {
          projectId,
          deletedAt: null,
          status: { not: TaskStatus.DONE },
          dueAt: { gte: now, lte: in7Days },
        },
      }),
      this.prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.task.groupBy({
        by: ['assigneeId', 'status'],
        where: {
          projectId,
          deletedAt: null,
          assigneeId: { not: null },
        },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          projectId,
          deletedAt: null,
          status: { not: TaskStatus.DONE },
          dueAt: { lt: now },
          assigneeId: { not: null },
        },
        _count: { id: true },
      }),
      this.prisma.taskComment.count({
        where: { projectId },
      }),
      this.prisma.attachment.count({
        where: { projectId },
      }),
    ]);

    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.DONE]: 0,
      [TaskStatus.BLOCKED]: 0,
    };
    for (const group of statusGroups) {
      byStatus[group.status] = group._count.id;
    }

    const byPriority: Record<TaskPriority, number> = {
      [TaskPriority.LOW]: 0,
      [TaskPriority.MEDIUM]: 0,
      [TaskPriority.HIGH]: 0,
      [TaskPriority.URGENT]: 0,
    };
    for (const group of priorityGroups) {
      byPriority[group.priority] = group._count.id;
    }

    const completedTasks = byStatus[TaskStatus.DONE];
    const completionRate =
      activeTasks > 0
        ? Math.round((completedTasks / activeTasks) * 1000) / 10
        : 0;

    const memberBreakdown = members.map((member) => {
      const memberId = member.userId;
      let assignedCount = 0;
      let memberDoneCount = 0;

      for (const group of memberTaskGroups) {
        if (group.assigneeId === memberId) {
          assignedCount += group._count.id;
          if (group.status === TaskStatus.DONE) {
            memberDoneCount += group._count.id;
          }
        }
      }

      const overdueGroup = memberOverdueGroups.find(
        (group) => group.assigneeId === memberId,
      );
      const memberOverdueCount = overdueGroup?._count.id ?? 0;

      return {
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        assignedTasks: assignedCount,
        completedTasks: memberDoneCount,
        overdueTasks: memberOverdueCount,
      };
    });

    return {
      tasks: {
        total: activeTasks,
        byStatus,
        byPriority,
        overdue: overdueCount,
        dueSoon: dueSoonCount,
        completionRate,
      },
      members: {
        total: members.length,
        breakdown: memberBreakdown,
      },
      activity: {
        totalComments,
        totalAttachments,
      },
    };
  }
}
