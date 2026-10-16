import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { TransferProjectOwnerDto } from './dto/transfer-project-owner.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@Controller('projects')
@UseGuards(AccessTokenGuard)
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    return this.projects.create(request.user.id, dto);
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query('includeArchived') includeArchived?: string,
  ) {
    if (includeArchived !== undefined && !['true', 'false'].includes(includeArchived)) {
      throw new BadRequestException('includeArchived must be true or false.');
    }
    return this.projects.list(request.user.id, includeArchived === 'true');
  }

  @Get(':projectId')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.get(projectId, request.user.id);
  }

  @Patch(':projectId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(projectId, request.user.id, dto);
  }

  @Delete(':projectId')
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.archive(projectId, request.user.id);
  }

  @Post(':projectId/restore')
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.restore(projectId, request.user.id);
  }

  @Get(':projectId/members')
  listMembers(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.listMembers(projectId, request.user.id);
  }

  @Post(':projectId/members')
  addMember(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projects.addMember(projectId, request.user.id, dto);
  }

  @Patch(':projectId/members/:memberId')
  updateMember(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projects.updateMember(
      projectId,
      request.user.id,
      memberId,
      dto,
    );
  }

  @Delete(':projectId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.projects.removeMember(projectId, request.user.id, memberId);
  }

  @Patch(':projectId/owner')
  transferOwner(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: TransferProjectOwnerDto,
  ) {
    return this.projects.transferOwner(projectId, request.user.id, dto);
  }
}
