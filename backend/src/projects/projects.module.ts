import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectAccessService } from './project-access.service';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectAccessService],
  exports: [ProjectAccessService],
})
export class ProjectsModule {}
