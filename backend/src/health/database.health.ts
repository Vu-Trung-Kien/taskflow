import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

const DATABASE_TIMEOUT_MS = 1500;

@Injectable()
export class DatabaseHealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  isHealthy(key: string) {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
        } catch (error) {
          // Ghi lỗi thật vào log, nhưng không đưa chi tiết (host, cổng...)
          // ra phản hồi công khai.
          this.logger.error(
            'Database health check failed',
            error instanceof Error ? error.stack : String(error),
          );
          throw new Error('database unreachable');
        }
      })
      .withTimeout(DATABASE_TIMEOUT_MS);
  }
}
