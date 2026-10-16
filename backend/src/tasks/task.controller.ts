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
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@Controller('projects/:projectId/tasks')
@UseGuards(AccessTokenGuard)
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksDto,
  ) {
    return this.tasks.list(projectId, request.user.id, query);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(projectId, request.user.id, dto);
  }

  @Get(':taskId')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.get(projectId, taskId, request.user.id);
  }

  @Patch(':taskId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(projectId, taskId, request.user.id, dto);
  }

  @Delete(':taskId')
  softDelete(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.softDelete(projectId, taskId, request.user.id);
  }

  @Post(':taskId/restore')
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.restore(projectId, taskId, request.user.id);
  }
}
