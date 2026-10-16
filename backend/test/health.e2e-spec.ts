import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Health (e2e)', () => {
  describe('khi DB hoạt động', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /health/live trả 200', async () => {
      const res = await request(app.getHttpServer()).get('/health/live').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /health/ready trả 200 và database up', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info.database.status).toBe('up');
    });

    it('GET /version trả về build metadata', async () => {
      const res = await request(app.getHttpServer()).get('/version').expect(200);
      expect(res.body).toEqual({
        gitSha: process.env.GIT_SHA ?? 'unknown',
        buildTime: process.env.BUILD_TIME ?? 'unknown',
      });
    });

    it('GET / không còn tồn tại (404)', async () => {
      await request(app.getHttpServer()).get('/').expect(404);
    });
  });

  describe('khi DB không truy cập được', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const failingPrisma = {
        $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused postgres:5432')),
      };
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(failingPrisma)
        .compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /health/live vẫn trả 200', async () => {
      await request(app.getHttpServer()).get('/health/live').expect(200);
    });

    it('GET /health/ready trả 503, database down, không lộ chi tiết', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready').expect(503);
      expect(res.body.status).toBe('error');
      expect(res.body.error.database.status).toBe('down');
      expect(JSON.stringify(res.body)).not.toContain('postgres:5432');
    });
  });
});
