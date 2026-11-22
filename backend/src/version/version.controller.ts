import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Version')
@Controller('version')
export class VersionController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Thông tin phiên bản', description: 'Trả về Git commit SHA và thời gian build của phiên bản đang chạy.' })
  getVersion(): { gitSha: string; buildTime: string } {
    return {
      gitSha: this.configService.get<string>('GIT_SHA') ?? 'unknown',
      buildTime: this.configService.get<string>('BUILD_TIME') ?? 'unknown',
    };
  }
}
