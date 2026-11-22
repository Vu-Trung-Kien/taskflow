import { Test } from '@nestjs/testing';
import { ProjectRole, TaskPriority, TaskStatus } from '../generated/prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let prisma: {
    task: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    projectMember: {
      findUnique: jest.Mock;
    };
  };
  let access: {
    requireMembership: jest.Mock;
    requireEditor: jest.Mock;
    requireActiveProject: jest.Mock;
  };
  let notifications: {
    createNotification: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      projectMember: {
        findUnique: jest.fn(),
      },
    };

    access = {
      requireMembership: jest.fn().mockResolvedValue({ role: ProjectRole.OWNER }),
      requireEditor: jest.fn().mockResolvedValue({ role: ProjectRole.OWNER }),
      requireActiveProject: jest.fn().mockResolvedValue({ id: 'p1' }),
    };

    notifications = {
      createNotification: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectAccessService, useValue: access },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(TaskService);
  });

  describe('list', () => {
    it('orders tasks by position asc and createdAt desc', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await service.list('p1', 'u1', {});

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        }),
      );
    });
  });

  describe('create', () => {
    it('calculates next position when position is not specified', async () => {
      prisma.task.findFirst.mockResolvedValue({ position: 65536.0 });
      prisma.task.create.mockResolvedValue({ id: 't1', title: 'Task 1', position: 131072.0 });

      const result = await service.create('p1', 'u1', {
        title: 'Task 1',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            position: 131072.0,
          }),
        }),
      );
      expect(result).toEqual({ id: 't1', title: 'Task 1', position: 131072.0 });
    });

    it('uses explicit position when provided', async () => {
      prisma.task.create.mockResolvedValue({ id: 't2', title: 'Task 2', position: 500.0 });

      await service.create('p1', 'u1', {
        title: 'Task 2',
        position: 500.0,
      });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            position: 500.0,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates position and status', async () => {
      prisma.task.findFirst
        .mockResolvedValueOnce({
          id: 't1',
          title: 'Task 1',
          status: TaskStatus.TODO,
          assigneeId: null,
          createdById: 'u1',
        })
        .mockResolvedValueOnce({
          id: 't1',
          title: 'Task 1',
          status: TaskStatus.IN_PROGRESS,
          position: 12345.0,
        });
      prisma.task.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('p1', 't1', 'u1', {
        status: TaskStatus.IN_PROGRESS,
        position: 12345.0,
      });

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: 't1', projectId: 'p1', deletedAt: null },
        data: expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          position: 12345.0,
        }),
      });
      expect(result).toEqual({
        id: 't1',
        title: 'Task 1',
        status: TaskStatus.IN_PROGRESS,
        position: 12345.0,
      });
    });
  });
});
