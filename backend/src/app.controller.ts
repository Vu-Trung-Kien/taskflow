import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import {
  DATABASE_PROBE,
  type DatabaseProbe,
} from './prisma/database-probe';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
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

  @Get('version')
  getVersion(): { gitSha: string; buildTime: string } {
    return {
      gitSha: this.configService.get<string>('GIT_SHA') ?? 'unknown',
      buildTime: this.configService.get<string>('BUILD_TIME') ?? 'unknown',
    };
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
