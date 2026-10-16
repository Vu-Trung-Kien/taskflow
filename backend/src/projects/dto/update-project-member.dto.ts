import { IsIn } from 'class-validator';
import { ProjectRole } from '../../generated/prisma/enums';

export class UpdateProjectMemberDto {
  @IsIn([ProjectRole.MEMBER, ProjectRole.VIEWER])
  role!: typeof ProjectRole.MEMBER | typeof ProjectRole.VIEWER;
}
