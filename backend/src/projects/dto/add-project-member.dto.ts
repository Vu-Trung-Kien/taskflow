import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';
import { ProjectRole } from '../../generated/prisma/enums';

export class AddProjectMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsIn([ProjectRole.MEMBER, ProjectRole.VIEWER])
  role!: typeof ProjectRole.MEMBER | typeof ProjectRole.VIEWER;
}
