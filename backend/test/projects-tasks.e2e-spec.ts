import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { configureApplication } from '../src/app-setup';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Projects and tasks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const emails: string[] = [];
  const projectIds: string[] = [];

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
    if (projectIds.length > 0) {
      await prisma.task.deleteMany({
        where: { projectId: { in: projectIds }, parentTaskId: { not: null } },
      });
      await prisma.task.deleteMany({
        where: { projectId: { in: projectIds } },
      });
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

  it('enforces project roles, project isolation, task hierarchy, archive, and soft-delete', async () => {
    const owner = await registerUser();
    const member = await registerUser();
    const viewer = await registerUser();
    const outsider = await registerUser();
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(owner.accessToken))
      .send({ name: 'Project Alpha' })
      .expect(201);
    const projectId = projectResponse.body.id as string;
    projectIds.push(projectId);
    expect(projectResponse.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: owner.id,
          role: 'OWNER',
        }),
      ]),
    );

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ email: member.email, role: 'MEMBER' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ email: viewer.email, role: 'VIEWER' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', bearer(outsider.accessToken))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', bearer(member.accessToken))
      .send({ name: 'Member must not rename project' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', bearer(viewer.accessToken))
      .send({ email: outsider.email, role: 'MEMBER' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${viewer.id}`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ role: 'OWNER' })
      .expect(400);
    const taskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .send({
        title: 'Release backend',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeId: owner.id,
        dueAt: '2026-12-01T12:00:00.000Z',
      })
      .expect(201);
    const taskId = taskResponse.body.id as string;
    expect(taskResponse.body.assignee.id).toBe(owner.id);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .send({ title: 'Assign outside project', assigneeId: outsider.id })
      .expect(400);
    const subTaskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .send({ title: 'Build image', parentTaskId: taskId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .send({
        title: 'Nested too deep',
        parentTaskId: subTaskResponse.body.id,
      })
      .expect(400);
    const updatedTask = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', bearer(member.accessToken))
      .send({ status: 'DONE', priority: 'URGENT', dueAt: null })
      .expect(200);
    expect(updatedTask.body).toMatchObject({
      status: 'DONE',
      priority: 'URGENT',
      dueAt: null,
    });

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(viewer.accessToken))
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(2));
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?includeDeleted=true`)
      .set('Authorization', bearer(viewer.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(viewer.accessToken))
      .send({ title: 'Viewer cannot create' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${viewer.id}`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ role: 'MEMBER' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(0));
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks?includeDeleted=true`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(2));
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/restore`)
      .set('Authorization', bearer(member.accessToken))
      .expect(201);
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${subTaskResponse.body.id}/restore`)
      .set('Authorization', bearer(member.accessToken))
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/projects/${projectId}`)
      .set('Authorization', bearer(owner.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(member.accessToken))
      .send({ title: 'Cannot mutate archived project' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/restore`)
      .set('Authorization', bearer(owner.accessToken))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/owner`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ userId: member.id })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ name: 'Former owner cannot edit' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/projects/${projectId}/members/${owner.id}`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200);

    const restoredTask = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200);
    expect(restoredTask.body.assignee).toBeNull();
  });

  it('returns project metrics including tasks by status, priority, overdue, and member breakdown', async () => {
    const owner = await registerUser();
    const member = await registerUser();
    const outsider = await registerUser();

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(owner.accessToken))
      .send({ name: 'Metrics Test Project' })
      .expect(201);
    const projectId = projectResponse.body.id as string;
    projectIds.push(projectId);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ email: member.email, role: 'MEMBER' })
      .expect(201);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(owner.accessToken))
      .send({
        title: 'Overdue task',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: member.id,
        dueAt: yesterday,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(owner.accessToken))
      .send({
        title: 'Completed task',
        status: 'DONE',
        priority: 'MEDIUM',
        assigneeId: member.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/metrics`)
      .set('Authorization', bearer(outsider.accessToken))
      .expect(403);

    const metricsResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/metrics`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200);

    const metrics = metricsResponse.body;
    expect(metrics.tasks.total).toBe(2);
    expect(metrics.tasks.byStatus.TODO).toBe(1);
    expect(metrics.tasks.byStatus.DONE).toBe(1);
    expect(metrics.tasks.byStatus.IN_PROGRESS).toBe(0);
    expect(metrics.tasks.byStatus.BLOCKED).toBe(0);
    expect(metrics.tasks.byPriority.HIGH).toBe(1);
    expect(metrics.tasks.byPriority.MEDIUM).toBe(1);
    expect(metrics.tasks.overdue).toBe(1);
    expect(metrics.tasks.completionRate).toBe(50);
    expect(metrics.members.total).toBe(2);

    const memberStat = metrics.members.breakdown.find(
      (m: { userId: string }) => m.userId === member.id,
    );
    expect(memberStat).toBeDefined();
    expect(memberStat.assignedTasks).toBe(2);
    expect(memberStat.completedTasks).toBe(1);
    expect(memberStat.overdueTasks).toBe(1);
  });

  it('exports tasks as CSV with UTF-8 BOM, appropriate headers and handles permissions', async () => {
    const owner = await registerUser();
    const member = await registerUser();
    const outsider = await registerUser();

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', bearer(owner.accessToken))
      .send({ name: 'CSV Export Project' })
      .expect(201);
    const projectId = projectResponse.body.id as string;
    projectIds.push(projectId);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', bearer(owner.accessToken))
      .send({ email: member.email, role: 'MEMBER' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', bearer(owner.accessToken))
      .send({
        title: 'Công việc thử nghiệm "xuất CSV"',
        description: 'Mô tả có dấu phẩy, và xuống dòng\nthứ hai',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        assigneeId: member.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/export`)
      .set('Authorization', bearer(outsider.accessToken))
      .expect(403);

    const exportResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks/export`)
      .set('Authorization', bearer(member.accessToken))
      .expect(200);

    expect(exportResponse.headers['content-type']).toContain('text/csv');
    expect(exportResponse.headers['content-disposition']).toContain('attachment; filename=');

    const csvText = exportResponse.text;
    expect(csvText.startsWith('\uFEFF')).toBe(true);
    expect(csvText).toContain('Tiêu đề');
    expect(csvText).toContain('Trạng thái');
    expect(csvText).toContain('"Công việc thử nghiệm ""xuất CSV"""');
    expect(csvText).toContain('"Mô tả có dấu phẩy, và xuống dòng\nthứ hai"');
    expect(csvText).toContain('Đang làm');
    expect(csvText).toContain('Khẩn cấp');
    expect(csvText).toContain(member.email);
  });

  async function registerUser() {
    const email = `project-e2e-${randomUUID()}@example.test`;
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
