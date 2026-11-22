import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  /** Liveness: tiến trình còn phản hồi. Không phụ thuộc DB. */
  @Get('live')
  @ApiOperation({ summary: 'Liveness check', description: 'Kiểm tra tiến trình ứng dụng còn phản hồi. Không phụ thuộc Database.' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: sẵn sàng phục vụ, tức là kết nối được DB. */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check', description: 'Kiểm tra ứng dụng sẵn sàng phục vụ: kết nối PostgreSQL thành công.' })
  ready() {
    return this.health.check([() => this.database.isHealthy('database')]);
  }
}
