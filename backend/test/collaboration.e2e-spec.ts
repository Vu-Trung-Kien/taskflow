import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { configureApplication } from '../src/app-setup';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Collaboration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const emails: string[] = [];
  const projectIds: string[] = [];
  const taskIds: string[] = [];

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
    if (taskIds.length > 0) {
      await prisma.taskComment.deleteMany({
        where: { taskId: { in: taskIds } },
      });
      await prisma.attachment.deleteMany({
        where: { taskId: { in: taskIds } },
      });
      await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    }
    if (projectIds.length > 0) {
      await prisma.projectMember.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.project.deleteMany({
        where: { id: { in: projectIds } },
      });
    }
    if (emails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await app.close();
  });

  it('enforces project roles for comments and attachment upload workflows', async () => {
    const owner = await registerUser();
    const member = await registerUser();
    const viewer = await registerUser();
    const outsider = await registerUser();
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(owner.accessToken))
      .send({ name: 'Collaboration project' })
      .expect(201);
    const projectId = projectResponse.body.id as string;
    projectIds.push(projectId);
    for (const user of [member, viewer]) {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/members`)
        .set('Authorization', bearer(owner.accessToken))
        .send({
          email: user.email,
          role: user === viewer ? 'VIEWER' : 'MEMBER',
        })
        .expect(201);
    }
    const taskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .send({ title: 'Task with collaboration' })
      .expect(201);
    const taskId = taskResponse.body.id as string;
    taskIds.push(taskId);

    const commentResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', bearer(member.accessToken))
      .send({ body: 'Implementation detail' })
      .expect(201);
    const commentId = commentResponse.body.id as string;
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', bearer(viewer.accessToken))
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([
          expect.objectContaining({
            id: commentId,
            body: 'Implementation detail',
            author: { id: member.id, name: null, email: member.email },
          }),
        ]),
      );
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', bearer(viewer.accessToken))
      .send({ body: 'Viewer cannot comment' })
      .expect(403);
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', bearer(outsider.accessToken))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ body: 'Edited by owner' })
      .expect(200);

    const uploadResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(member.accessToken))
      .send({
        fileName: 'plan.pdf',
        contentType: 'application/pdf',
        sizeBytes: 512,
      })
      .expect(201);
    expect(uploadResponse.body).toMatchObject({
      attachment: {
        fileName: 'plan.pdf',
        contentType: 'application/pdf',
        sizeBytes: 512,
        uploadedAt: null,
      },
      expiresInSeconds: 300,
    });
    expect(uploadResponse.body.uploadUrl).toContain('X-Amz-Expires=300');

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(member.accessToken))
      .send({
        fileName: 'unsafe.svg',
        contentType: 'image/svg+xml',
        sizeBytes: 512,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/attachments`)
      .set('Authorization', bearer(viewer.accessToken))
      .send({
        fileName: 'plan.pdf',
        contentType: 'application/pdf',
        sizeBytes: 512,
      })
      .expect(403);
  });

  async function registerUser() {
    const email = `collaboration-e2e-${randomUUID()}@example.test`;
    emails.push(email);
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'safe-password-for-test' })
      .expect(201);
    return {
      id: response.body.user.id as string,
      email,
      accessToken: response.body.accessToken as string,
    };
  }

  function bearer(accessToken: string): string {
    return `Bearer ${accessToken}`;
  }
});
