import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CollaborationService } from './collaboration.service';

@Controller('projects/:projectId/tasks/:taskId')
@UseGuards(AccessTokenGuard)
export class CollaborationController {
  constructor(private readonly collaboration: CollaborationService) {}

  @Get('comments')
  listComments(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.collaboration.listComments(projectId, taskId, request.user.id);
  }

  @Post('comments')
  createComment(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.collaboration.createComment(
      projectId,
      taskId,
      request.user.id,
      dto,
    );
  }

  @Patch('comments/:commentId')
  updateComment(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.collaboration.updateComment(
      projectId,
      taskId,
      commentId,
      request.user.id,
      dto,
    );
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  deleteComment(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.collaboration.deleteComment(
      projectId,
      taskId,
      commentId,
      request.user.id,
    );
  }

  @Get('attachments')
  listAttachments(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.collaboration.listAttachments(
      projectId,
      taskId,
      request.user.id,
    );
  }

  @Post('attachments')
  createAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.collaboration.createAttachment(
      projectId,
      taskId,
      request.user.id,
      dto,
    );
  }

  @Post('attachments/:attachmentId/complete')
  completeAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.collaboration.completeAttachment(
      projectId,
      taskId,
      attachmentId,
      request.user.id,
    );
  }

  @Get('attachments/:attachmentId/download')
  getAttachmentDownloadUrl(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.collaboration.getAttachmentDownloadUrl(
      projectId,
      taskId,
      attachmentId,
      request.user.id,
    );
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  deleteAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.collaboration.deleteAttachment(
      projectId,
      taskId,
      attachmentId,
      request.user.id,
    );
  }
}
