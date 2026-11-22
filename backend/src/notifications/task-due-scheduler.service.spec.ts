import { Test } from '@nestjs/testing';
import { NotificationType } from '../generated/prisma/enums';
import { TaskStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { TaskDueSchedulerService } from './task-due-scheduler.service';

describe('TaskDueSchedulerService', () => {
  let service: TaskDueSchedulerService;
  let prisma: {
    task: {
      findMany: jest.Mock;
    };
    notification: {
      findFirst: jest.Mock;
    };
  };
  let notificationService: {
    createNotification: jest.Mock;
  };

  const now = new Date('2026-11-21T10:00:00.000Z');
  const dueSoon = new Date('2026-11-21T18:00:00.000Z');

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn(),
      },
      notification: {
        findFirst: jest.fn(),
      },
    };

    notificationService = {
      createNotification: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskDueSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = moduleRef.get(TaskDueSchedulerService);
  });

  describe('checkDueTasks', () => {
    it('creates TASK_DUE_SOON notification for tasks due within window', async () => {
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Implement rate limiting',
          projectId: 'proj-1',
          assigneeId: 'user-1',
          createdById: 'user-2',
          dueAt: dueSoon,
        },
      ]);
      prisma.notification.findFirst.mockResolvedValue(null);

      const count = await service.checkDueTasks(now, 24);

      expect(count).toBe(1);
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: { not: TaskStatus.DONE },
          dueAt: {
            gte: now,
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
          project: {
            archivedAt: null,
          },
        },
        select: {
          id: true,
          title: true,
          projectId: true,
          assigneeId: true,
          createdById: true,
          dueAt: true,
        },
      });

      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user-1',
        actorId: null,
        type: NotificationType.TASK_DUE_SOON,
        title: 'Công việc sắp đến hạn',
        message: 'Công việc "Implement rate limiting" sắp đến hạn hoàn thành (2026-11-21).',
        data: {
          projectId: 'proj-1',
          taskId: 'task-1',
          dueAt: dueSoon.toISOString(),
        },
      });
    });

    it('falls back to createdById if assigneeId is null', async () => {
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-2',
          title: 'Unassigned task',
          projectId: 'proj-1',
          assigneeId: null,
          createdById: 'user-2',
          dueAt: dueSoon,
        },
      ]);
      prisma.notification.findFirst.mockResolvedValue(null);

      const count = await service.checkDueTasks(now, 24);

      expect(count).toBe(1);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: NotificationType.TASK_DUE_SOON,
        }),
      );
    });

    it('skips task if notification was already sent within 24 hours', async () => {
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Already notified task',
          projectId: 'proj-1',
          assigneeId: 'user-1',
          createdById: 'user-2',
          dueAt: dueSoon,
        },
      ]);
      prisma.notification.findFirst.mockResolvedValue({ id: 'existing-notif-1' });

      const count = await service.checkDueTasks(now, 24);

      expect(count).toBe(0);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('skips task if no recipient can be resolved', async () => {
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-3',
          title: 'Ghost task',
          projectId: 'proj-1',
          assigneeId: null,
          createdById: null,
          dueAt: dueSoon,
        },
      ]);

      const count = await service.checkDueTasks(now, 24);
      expect(count).toBe(0);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('handleCron', () => {
    it('executes checkDueTasks successfully', async () => {
      jest.spyOn(service, 'checkDueTasks').mockResolvedValue(3);
      const result = await service.handleCron();
      expect(result).toBe(3);
    });

    it('catches and logs errors without throwing', async () => {
      jest.spyOn(service, 'checkDueTasks').mockRejectedValue(new Error('DB connection failed'));
      const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
      const result = await service.handleCron();
      expect(result).toBe(0);
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
