import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../generated/prisma/enums';

export class ListTasksDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  includeDeleted?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
