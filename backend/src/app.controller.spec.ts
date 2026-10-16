import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DATABASE_PROBE } from './prisma/database-probe';

describe('AppController', () => {
  let appController: AppController;
  let databaseProbe: { check: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    databaseProbe = { check: jest.fn() };
    configService = { get: jest.fn() };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: ConfigService, useValue: configService },
        { provide: DATABASE_PROBE, useValue: databaseProbe },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health/live', () => {
    it('should report that the application is running', () => {
      expect(appController.getLiveness()).toEqual({ status: 'ok' });
    });
  });

  describe('version', () => {
    it('should return the build identity from configuration', () => {
      configService.get.mockImplementation((key: string) =>
        key === 'GIT_SHA' ? 'abc1234' : '2026-10-16T02:00:00Z',
      );

      expect(appController.getVersion()).toEqual({
        gitSha: 'abc1234',
        buildTime: '2026-10-16T02:00:00Z',
      });
    });

    it('should identify unavailable build metadata as unknown', () => {
      configService.get.mockReturnValue(undefined);

      expect(appController.getVersion()).toEqual({
        gitSha: 'unknown',
        buildTime: 'unknown',
      });
    });
  });

  describe('health/ready', () => {
    it('should report ready when the database query succeeds', async () => {
      databaseProbe.check.mockResolvedValue(undefined);

      await expect(appController.getReadiness()).resolves.toEqual({
        status: 'ok',
      });
      expect(databaseProbe.check).toHaveBeenCalled();
    });

    it('should report unavailable when the database query fails', async () => {
      databaseProbe.check.mockRejectedValue(new Error('connection failed'));

      await expect(appController.getReadiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
