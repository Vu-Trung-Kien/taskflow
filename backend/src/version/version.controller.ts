import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('version')
export class VersionController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getVersion(): { gitSha: string; buildTime: string } {
    return {
      gitSha: this.configService.get<string>('GIT_SHA') ?? 'unknown',
      buildTime: this.configService.get<string>('BUILD_TIME') ?? 'unknown',
    };
  }
}
