import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '../generated/prisma/enums';
import { TaskStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class TaskDueSchedulerService {
  private readonly logger = new Logger(TaskDueSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron(): Promise<number> {
    this.logger.debug('Running scheduled scan for tasks due soon...');
    try {
      const count = await this.checkDueTasks();
      if (count > 0) {
        this.logger.log(`Created ${count} TASK_DUE_SOON notification(s).`);
      }
      return count;
    } catch (error) {
      this.logger.error('Failed to run scheduled scan for tasks due soon', error);
      return 0;
    }
  }

  async checkDueTasks(referenceDate: Date = new Date(), windowHours = 24): Promise<number> {
    const windowEnd = new Date(referenceDate.getTime() + windowHours * 60 * 60 * 1000);

    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { not: TaskStatus.DONE },
        dueAt: {
          gte: referenceDate,
          lte: windowEnd,
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

    let createdCount = 0;

    for (const task of tasks) {
      const recipientId = task.assigneeId ?? task.createdById;
      if (!recipientId || !task.dueAt) {
        continue;
      }

      // Check if a notification of type TASK_DUE_SOON has already been created for this task
      // within the last 24 hours to prevent spamming
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: recipientId,
          type: NotificationType.TASK_DUE_SOON,
          data: {
            path: ['taskId'],
            equals: task.id,
          },
          createdAt: {
            gte: new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000),
          },
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const formattedDueDate = task.dueAt.toISOString().slice(0, 10);
      await this.notificationService.createNotification({
        userId: recipientId,
        actorId: null,
        type: NotificationType.TASK_DUE_SOON,
        title: 'Công việc sắp đến hạn',
        message: `Công việc "${task.title}" sắp đến hạn hoàn thành (${formattedDueDate}).`,
        data: {
          projectId: task.projectId,
          taskId: task.id,
          dueAt: task.dueAt.toISOString(),
        },
      });

      createdCount++;
    }

    return createdCount;
  }
}
