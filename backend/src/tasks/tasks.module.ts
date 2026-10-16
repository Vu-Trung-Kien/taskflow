import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectAccessService } from '../projects/project-access.service';
import { ProjectsModule } from '../projects/projects.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [AuthModule, PrismaModule, ProjectsModule],
  controllers: [TaskController],
  providers: [TaskService, ProjectAccessService],
})
export class TasksModule {}
