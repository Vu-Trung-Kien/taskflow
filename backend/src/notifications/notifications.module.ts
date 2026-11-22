import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TaskDueSchedulerService } from './task-due-scheduler.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, TaskDueSchedulerService],
  exports: [NotificationService, TaskDueSchedulerService],
})
export class NotificationsModule {}
