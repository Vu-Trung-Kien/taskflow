import { HttpException, Logger } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseHealthIndicator } from './database.health';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const prismaMock = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    prismaMock.$queryRaw.mockReset();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
      providers: [
        DatabaseHealthIndicator,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('live', () => {
    it('trả về ok và không chạm DB', () => {
      expect(controller.live()).toEqual({ status: 'ok' });
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('trả về ok khi DB trả lời', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await expect(controller.ready()).resolves.toMatchObject({
        status: 'ok',
        info: { database: { status: 'up' } },
      });
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('trả về 503 khi DB lỗi và không lộ chi tiết lỗi', async () => {
      prismaMock.$queryRaw.mockRejectedValue(
        new Error("Can't reach database server at `postgres:5432`"),
      );

      const error = await controller.ready().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(503);
      expect(exception.getResponse()).toMatchObject({
        status: 'error',
        error: { database: { status: 'down', message: 'database unreachable' } },
      });
      expect(JSON.stringify(exception.getResponse())).not.toContain('postgres:5432');
    });
  });
});
