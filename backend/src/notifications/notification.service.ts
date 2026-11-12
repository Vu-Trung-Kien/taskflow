import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { NotificationType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationParams {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, limit = 50) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true, isRead: true },
    });
    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại.');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async createNotification(params: CreateNotificationParams) {
    if (params.actorId && params.userId === params.actorId) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        actorId: params.actorId ?? null,
        type: params.type,
        title: params.title,
        message: params.message,
        data: (params.data ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }
}
