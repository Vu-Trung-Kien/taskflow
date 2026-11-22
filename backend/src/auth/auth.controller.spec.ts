import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getProfile: jest.Mock;
    changePassword: jest.Mock;
    updateProfile: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  const mockResponse = () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const res = {
      cookie,
      clearCookie,
    } as unknown as Response & { cookie: jest.Mock; clearCookie: jest.Mock };
    cookie.mockReturnValue(res);
    clearCookie.mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
      changePassword: jest.fn(),
      updateProfile: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({
        canActivate: (_context: ExecutionContext) => true,
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: (_context: ExecutionContext) => true,
      })
      .compile();

    controller = moduleRef.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('has ThrottlerGuard applied to register, login, and changePassword endpoints', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const registerMethod = controller.register;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const loginMethod = controller.login;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const changePasswordMethod = controller.changePassword;

    const registerGuards = Reflect.getMetadata('__guards__', registerMethod);
    const loginGuards = Reflect.getMetadata('__guards__', loginMethod);
    const changePasswordGuards = Reflect.getMetadata('__guards__', changePasswordMethod);

    expect(registerGuards).toEqual(expect.arrayContaining([ThrottlerGuard]));
    expect(loginGuards).toEqual(expect.arrayContaining([ThrottlerGuard]));
    expect(changePasswordGuards).toEqual(expect.arrayContaining([AccessTokenGuard, ThrottlerGuard]));
  });

  describe('register', () => {
    it('registers user and sets refresh cookie', async () => {
      const mockResult = {
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        expiresIn: 900,
        sessionExpiresAt: new Date(Date.now() + 100000),
        user: { id: 'u1', email: 'test@example.com', name: 'User' },
      };
      authService.register.mockResolvedValue(mockResult);

      const res = mockResponse();
      const result = await controller.register(
        { email: 'test@example.com', password: 'Password123!', name: 'User' },
        res,
      );

      expect(authService.register).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'taskflow_refresh',
        'mock-refresh',
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
      expect(result).toEqual({
        accessToken: 'mock-access',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: mockResult.user,
      });
    });
  });

  describe('login', () => {
    it('authenticates user and sets refresh cookie', async () => {
      const mockResult = {
        accessToken: 'mock-access-login',
        refreshToken: 'mock-refresh-login',
        expiresIn: 900,
        sessionExpiresAt: new Date(Date.now() + 100000),
        user: { id: 'u1', email: 'test@example.com', name: 'User' },
      };
      authService.login.mockResolvedValue(mockResult);

      const res = mockResponse();
      const result = await controller.login(
        { email: 'test@example.com', password: 'Password123!' },
        res,
      );

      expect(authService.login).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'taskflow_refresh',
        'mock-refresh-login',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        accessToken: 'mock-access-login',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: mockResult.user,
      });
    });
  });

  describe('changePassword', () => {
    it('delegates to authService.changePassword with userId, dto, and sessionId', async () => {
      authService.changePassword.mockResolvedValue({
        message: 'Mật khẩu đã được thay đổi thành công.',
      });

      const fakeReq = {
        user: { id: 'u1', email: 'test@example.com', sessionId: 's1' },
      } as any;

      const dto = {
        currentPassword: 'old-password-1234',
        newPassword: 'new-password-5678',
      };

      const result = await controller.changePassword(fakeReq, dto);

      expect(authService.changePassword).toHaveBeenCalledWith('u1', dto, 's1');
      expect(result).toEqual({
        message: 'Mật khẩu đã được thay đổi thành công.',
      });
    });
  });

  describe('updateProfile', () => {
    it('delegates to authService.updateProfile with userId and dto', async () => {
      const updatedUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Updated Name',
      };
      authService.updateProfile.mockResolvedValue(updatedUser);

      const fakeReq = {
        user: { id: 'u1', email: 'test@example.com' },
      } as any;

      const dto = { name: 'Updated Name' };

      const result = await controller.updateProfile(fakeReq, dto);

      expect(authService.updateProfile).toHaveBeenCalledWith('u1', dto);
      expect(result).toEqual(updatedUser);
    });
  });
});
