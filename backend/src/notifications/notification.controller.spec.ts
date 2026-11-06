import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import type { AuthenticatedRequest } from '../auth/access-token.guard';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: {
    list: jest.Mock;
    markAsRead: jest.Mock;
    markAllAsRead: jest.Mock;
  };

  const fakeReq = {
    user: { id: 'u1', email: 'test@example.com' },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    service = {
      list: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: service },
        { provide: JwtService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(NotificationController);
  });

  it('delegates listing notifications to service', async () => {
    service.list.mockResolvedValue({ notifications: [], unreadCount: 0 });
    const result = await controller.list(fakeReq, '20');
    expect(service.list).toHaveBeenCalledWith('u1', 20);
    expect(result).toEqual({ notifications: [], unreadCount: 0 });
  });

  it('delegates markAsRead to service', async () => {
    service.markAsRead.mockResolvedValue({ id: 'n1', isRead: true });
    const result = await controller.markAsRead(fakeReq, 'n1');
    expect(service.markAsRead).toHaveBeenCalledWith('u1', 'n1');
    expect(result).toEqual({ id: 'n1', isRead: true });
  });

  it('delegates markAllAsRead to service', async () => {
    service.markAllAsRead.mockResolvedValue({ updatedCount: 3 });
    const result = await controller.markAllAsRead(fakeReq);
    expect(service.markAllAsRead).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ updatedCount: 3 });
  });
});
