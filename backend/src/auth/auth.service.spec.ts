import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService - changePassword', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    authSession: {
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const oldPassword = 'current-safe-password-123';
  const newPassword = 'new-safe-password-456';

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      authSession: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('throws UnauthorizedException if user is not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.changePassword('u1', {
        currentPassword: oldPassword,
        newPassword,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if current password is wrong', async () => {
    const existingHash = await argon2.hash(oldPassword, { type: argon2.argon2id });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: existingHash,
    });

    await expect(
      service.changePassword('u1', {
        currentPassword: 'wrong-password-999',
        newPassword,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException if new password matches existing password', async () => {
    const existingHash = await argon2.hash(oldPassword, { type: argon2.argon2id });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: existingHash,
    });

    await expect(
      service.changePassword('u1', {
        currentPassword: oldPassword,
        newPassword: oldPassword,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates password and revokes other sessions successfully', async () => {
    const existingHash = await argon2.hash(oldPassword, { type: argon2.argon2id });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: existingHash,
    });
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    prisma.authSession.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.changePassword(
      'u1',
      {
        currentPassword: oldPassword,
        newPassword,
      },
      'current-session-id',
    );

    expect(result).toEqual({
      message: 'Mật khẩu đã được thay đổi thành công.',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: expect.any(String) },
    });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        id: { not: 'current-session-id' },
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  describe('updateProfile', () => {
    it('throws UnauthorizedException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('u1', { name: 'New Name' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates user display name and returns AuthUser', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        name: 'New Name',
      });

      const result = await service.updateProfile('u1', { name: 'New Name' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'New Name' },
        select: { id: true, email: true, name: true },
      });
      expect(result).toEqual({
        id: 'u1',
        email: 'test@example.com',
        name: 'New Name',
      });
    });
  });
});
