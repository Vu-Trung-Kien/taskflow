import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  DATABASE_PROBE,
  type DatabaseProbe,
} from './prisma/database-probe';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(DATABASE_PROBE) private readonly databaseProbe: DatabaseProbe,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/live')
  getLiveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('health/ready')
  async getReadiness(): Promise<{ status: 'ok' }> {
    try {
      await this.databaseProbe.check();
      return { status: 'ok' };
    } catch (error) {
      throw new ServiceUnavailableException('Database is unavailable', {
        cause: error,
      });
    }
  }
}
