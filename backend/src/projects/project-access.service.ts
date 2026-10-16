import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectMember, ProjectRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Project not found.');
    }
    return membership;
  }

  async requireOwner(projectId: string, userId: string): Promise<ProjectMember> {
    const membership = await this.requireMembership(projectId, userId);
    if (membership.role !== ProjectRole.OWNER) {
      throw new ForbiddenException('Project owner role is required.');
    }
    return membership;
  }

  async requireEditor(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember> {
    const membership = await this.requireMembership(projectId, userId);
    if (membership.role === ProjectRole.VIEWER) {
      throw new ForbiddenException('Project member role is required.');
    }
    return membership;
  }

  async requireActiveProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { archivedAt: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found.');
    }
    if (project.archivedAt) {
      throw new ForbiddenException('Archived projects are read-only.');
    }
  }
}
