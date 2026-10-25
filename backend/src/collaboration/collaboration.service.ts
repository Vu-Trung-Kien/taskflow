import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ProjectRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { S3StorageService } from './s3-storage.service';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const DEFAULT_ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
];

@Injectable()
export class CollaborationService {
  private readonly allowedContentTypes: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly storage: S3StorageService,
    config: ConfigService,
  ) {
    const configuredTypes = config.get<string>('S3_ALLOWED_CONTENT_TYPES');
    const contentTypes =
      configuredTypes !== undefined
        ? configuredTypes.split(',').map((value) => value.trim().toLowerCase())
        : DEFAULT_ALLOWED_CONTENT_TYPES;
    if (
      contentTypes.length === 0 ||
      contentTypes.some((value) => value.length === 0)
    ) {
      throw new Error(
        'S3_ALLOWED_CONTENT_TYPES must contain a comma-separated MIME allowlist.',
      );
    }
    this.allowedContentTypes = new Set(contentTypes);
  }

  async listComments(projectId: string, taskId: string, userId: string) {
    await this.requireTask(projectId, taskId, userId, false);
    return this.prisma.taskComment.findMany({
      where: { projectId, taskId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createComment(
    projectId: string,
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    await this.requireTask(projectId, taskId, userId, true);
    return this.prisma.taskComment.create({
      data: { projectId, taskId, authorId: userId, body: dto.body },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateComment(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    const membership = await this.requireTask(projectId, taskId, userId, true);
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, projectId, taskId },
      select: { id: true, authorId: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }
    this.requireCommentManager(comment.authorId, userId, membership.role);
    return this.prisma.taskComment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteComment(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
  ) {
    const membership = await this.requireTask(projectId, taskId, userId, true);
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, projectId, taskId },
      select: { id: true, authorId: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }
    this.requireCommentManager(comment.authorId, userId, membership.role);
    await this.prisma.taskComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  async listAttachments(projectId: string, taskId: string, userId: string) {
    await this.requireTask(projectId, taskId, userId, false);
    return this.prisma.attachment.findMany({
      where: { projectId, taskId, uploadedAt: { not: null } },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        sizeBytes: true,
        uploadedAt: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAttachment(
    projectId: string,
    taskId: string,
    userId: string,
    dto: CreateAttachmentDto,
  ) {
    await this.requireTask(projectId, taskId, userId, true);
    this.storage.assertConfigured();
    if (dto.sizeBytes > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('Attachment size must not exceed 10 MiB.');
    }
    if (!this.allowedContentTypes.has(dto.contentType)) {
      throw new BadRequestException(
        'This attachment content type is not allowed.',
      );
    }

    const attachment = await this.prisma.attachment.create({
      data: {
        projectId,
        taskId,
        uploadedById: userId,
        objectKey: `${projectId}/${taskId}/${randomUUID()}`,
        fileName: dto.fileName,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
      },
    });
    const uploadUrl = await this.storage.createUploadUrl(
      attachment.objectKey,
      attachment.contentType,
      attachment.sizeBytes,
    );
    return {
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        uploadedAt: attachment.uploadedAt,
        createdAt: attachment.createdAt,
      },
      uploadUrl,
      expiresInSeconds: 300,
    };
  }

  async completeAttachment(
    projectId: string,
    taskId: string,
    attachmentId: string,
    userId: string,
  ) {
    await this.requireTask(projectId, taskId, userId, true);
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        projectId,
        taskId,
        uploadedById: userId,
        uploadedAt: null,
      },
    });
    if (!attachment) {
      throw new NotFoundException('Pending attachment not found.');
    }
    const actual = await this.storage.inspectObject(attachment.objectKey);
    if (
      actual.contentLength !== attachment.sizeBytes ||
      actual.contentType !== attachment.contentType
    ) {
      await this.storage.deleteObject(attachment.objectKey);
      await this.prisma.attachment.delete({ where: { id: attachment.id } });
      throw new BadRequestException(
        'Uploaded object does not match the declared size and content type.',
      );
    }
    const updated = await this.prisma.attachment.updateMany({
      where: { id: attachment.id, uploadedAt: null },
      data: { uploadedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'Attachment upload has already been completed.',
      );
    }
    return this.prisma.attachment.findUniqueOrThrow({
      where: { id: attachment.id },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        sizeBytes: true,
        uploadedAt: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getAttachmentDownloadUrl(
    projectId: string,
    taskId: string,
    attachmentId: string,
    userId: string,
  ) {
    await this.requireTask(projectId, taskId, userId, false);
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        projectId,
        taskId,
        uploadedAt: { not: null },
      },
      select: { objectKey: true, fileName: true },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found.');
    }
    return {
      downloadUrl: await this.storage.createDownloadUrl(
        attachment.objectKey,
        attachment.fileName,
      ),
      expiresInSeconds: 300,
    };
  }

  async deleteAttachment(
    projectId: string,
    taskId: string,
    attachmentId: string,
    userId: string,
  ) {
    const membership = await this.requireTask(projectId, taskId, userId, true);
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, projectId, taskId },
      select: { id: true, objectKey: true, uploadedById: true },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found.');
    }
    this.requireCommentManager(
      attachment.uploadedById,
      userId,
      membership.role,
    );
    await this.storage.deleteObject(attachment.objectKey);
    await this.prisma.attachment.delete({ where: { id: attachment.id } });
    return { deleted: true };
  }

  private async requireTask(
    projectId: string,
    taskId: string,
    userId: string,
    write: boolean,
  ) {
    const membership = write
      ? await this.access.requireEditor(projectId, userId)
      : await this.access.requireMembership(projectId, userId);
    if (write) {
      await this.access.requireActiveProject(projectId);
    }
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found.');
    }
    return membership;
  }

  private requireCommentManager(
    ownerId: string,
    userId: string,
    role: ProjectRole,
  ): void {
    if (ownerId !== userId && role !== ProjectRole.OWNER) {
      throw new ForbiddenException(
        'Only the author or project owner can modify this item.',
      );
    }
  }
}
