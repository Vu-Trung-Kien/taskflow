import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectAccessService } from '../projects/project-access.service';
import { ProjectsModule } from '../projects/projects.module';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [AuthModule, PrismaModule, ProjectsModule],
  controllers: [CollaborationController],
  providers: [CollaborationService, ProjectAccessService, S3StorageService],
})
export class CollaborationModule {}
