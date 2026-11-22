import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { VersionModule } from './version/version.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<string | number>('AUTH_RATE_LIMIT_TTL')
            ? Number(config.get('AUTH_RATE_LIMIT_TTL'))
            : 60000,
          limit: config.get<string | number>('AUTH_RATE_LIMIT_MAX')
            ? Number(config.get('AUTH_RATE_LIMIT_MAX'))
            : 10,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CollaborationModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    HealthModule,
    VersionModule,
  ],
})
export class AppModule {}
