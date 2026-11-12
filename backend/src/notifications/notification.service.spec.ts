import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificationType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(NotificationService);
  });

  describe('list', () => {
    it('returns notifications and unread count', async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      prisma.notification.count.mockResolvedValue(1);

      const res = await service.list('u1', 10);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      });
      expect(res).toEqual({ notifications: [{ id: 'n1' }], unreadCount: 1 });
    });
  });

  describe('markAsRead', () => {
    it('throws NotFoundException if notification does not exist', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      await expect(service.markAsRead('u1', 'n1')).rejects.toThrow(NotFoundException);
    });

    it('returns directly if already marked read', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'n1', isRead: true });
      const res = await service.markAsRead('u1', 'n1');
      expect(res).toEqual({ id: 'n1', isRead: true });
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('updates isRead to true if unread', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'n1', isRead: false });
      prisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });
      const res = await service.markAsRead('u1', 'n1');
      expect(prisma.notification.update).toHaveBeenCalled();
      expect(res.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread notifications for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });
      const res = await service.markAllAsRead('u1');
      expect(prisma.notification.updateMany).toHaveBeenCalled();
      expect(res).toEqual({ updatedCount: 5 });
    });
  });

  describe('createNotification', () => {
    it('does not create notification if actor is recipient', async () => {
      const res = await service.createNotification({
        userId: 'u1',
        actorId: 'u1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Title',
        message: 'Message',
      });
      expect(res).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('creates notification if actor is different', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      const res = await service.createNotification({
        userId: 'u2',
        actorId: 'u1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Title',
        message: 'Message',
      });
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(res).toEqual({ id: 'n1' });
    });
  });
});
