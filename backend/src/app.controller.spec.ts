import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DATABASE_PROBE } from './prisma/database-probe';

describe('AppController', () => {
  let appController: AppController;
  let databaseProbe: { check: jest.Mock };

  beforeEach(async () => {
    databaseProbe = { check: jest.fn() };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
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
