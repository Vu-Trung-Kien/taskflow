import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('projects/:projectId/tasks')
@UseGuards(AccessTokenGuard)
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách công việc theo dự án', description: 'Lọc theo trạng thái, mức ưu tiên và bao gồm/loại trừ task đã xóa mềm.' })
  list(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksDto,
  ) {
    return this.tasks.list(projectId, request.user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo công việc mới (task hoặc sub-task)' })
  create(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(projectId, request.user.id, dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Xuất danh sách công việc dạng CSV (UTF-8 BOM, RFC 4180)' })
  async exportCsv(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksDto,
    @Res() response: Response,
  ) {
    const csvContent = await this.tasks.exportCsv(
      projectId,
      request.user.id,
      query,
    );
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="tasks-${projectId}-${Date.now()}.csv"`,
    );
    response.send(csvContent);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Chi tiết công việc (bao gồm sub-tasks)' })
  get(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.get(projectId, taskId, request.user.id);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Cập nhật công việc (trạng thái, ưu tiên, vị trí Kanban...)' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(projectId, taskId, request.user.id, dto);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Xóa mềm công việc (Soft Delete)' })
  softDelete(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.softDelete(projectId, taskId, request.user.id);
  }

  @Post(':taskId/restore')
  @ApiOperation({ summary: 'Khôi phục công việc đã xóa mềm' })
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.restore(projectId, taskId, request.user.id);
  }
}
