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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CollaborationService } from './collaboration.service';

@ApiTags('Collaboration')
@ApiBearerAuth('JWT-auth')
@Controller('projects/:projectId/tasks/:taskId')
@UseGuards(AccessTokenGuard)
export class CollaborationController {
  constructor(private readonly collaboration: CollaborationService) {}

  @Get('comments')
  @ApiOperation({ summary: 'Danh sách bình luận trên công việc' })
  listComments(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.collaboration.listComments(projectId, taskId, request.user.id);
  }

  @Post('comments')
  @ApiOperation({ summary: 'Tạo bình luận mới' })
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
  @ApiOperation({ summary: 'Sửa bình luận' })
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
  @ApiOperation({ summary: 'Xóa bình luận' })
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
  @ApiOperation({ summary: 'Danh sách tệp đính kèm' })
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
  @ApiOperation({ summary: 'Yêu cầu Presigned URL tải lên tệp đính kèm' })
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
  @ApiOperation({ summary: 'Xác nhận tải lên hoàn tất (HeadObject S3)' })
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
  @ApiOperation({ summary: 'Lấy Presigned URL tải xuống tệp đính kèm' })
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
  @ApiOperation({ summary: 'Xóa tệp đính kèm' })
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
