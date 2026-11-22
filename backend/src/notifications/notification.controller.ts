import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(AccessTokenGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của người dùng hiện tại', description: 'Trả về danh sách thông báo in-app, tùy chỉnh số lượng qua query param `limit` (1-100, mặc định 50).' })
  list(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100) : 50;
    return this.notifications.list(request.user.id, parsedLimit);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  markAsRead(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markAsRead(request.user.id, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Đánh dấu toàn bộ thông báo đã đọc' })
  markAllAsRead(@Req() request: AuthenticatedRequest) {
    return this.notifications.markAllAsRead(request.user.id);
  }
}
