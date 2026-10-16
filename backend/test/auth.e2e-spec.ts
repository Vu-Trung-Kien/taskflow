import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { configureApplication } from '../src/app-setup';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const emails: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApplication(app);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    if (emails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await app.close();
  });

  it('registers a user, sets an HttpOnly refresh cookie, and authenticates access JWT', async () => {
    const email = uniqueEmail();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email.toUpperCase(), password: 'safe-password-for-test', name: 'E2E User' })
      .expect(201);
    const cookie = refreshCookie(response);

    expect(response.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { email, name: 'E2E User' },
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ email, name: 'E2E User' }));
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'safe-password-for-test' })
      .expect(409);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email.toUpperCase(), password: 'safe-password-for-test' })
      .expect(200);
    expect(login.body.user.email).toBe(email);
    refreshCookie(login);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('rotates refresh tokens and revokes the session if an old token is replayed', async () => {
    const email = uniqueEmail();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'safe-password-for-test' })
      .expect(201);
    const originalCookie = refreshCookie(registered);

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(200);
    const rotatedCookie = refreshCookie(rotated);
    expect(rotatedCookie).not.toBe(originalCookie);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', rotatedCookie)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${rotated.body.accessToken}`)
      .expect(401);
  });

  it('rejects passwords shorter than the registration minimum', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: 'short' })
      .expect(400);
  });

  function uniqueEmail(): string {
    const email = `auth-e2e-${randomUUID()}@example.test`;
    emails.push(email);
    return email;
  }

  function refreshCookie(response: request.Response): string {
    const setCookie = response.headers['set-cookie']?.[0];
    if (!setCookie) {
      throw new Error('Expected the response to set a refresh cookie.');
    }
    return setCookie.split(';', 1)[0];
  }
});
