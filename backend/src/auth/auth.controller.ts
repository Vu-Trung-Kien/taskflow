import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AccessTokenGuard } from './access-token.guard';
import type { AuthenticatedRequest } from './access-token.guard';
import { AuthService, AuthResult } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const REFRESH_COOKIE = 'taskflow_refresh';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới', description: 'Tạo tài khoản người dùng mới, trả về Access Token và đặt Refresh Token cookie. Được bảo vệ bởi Rate Limiting.' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respondWithSession(response, await this.authService.register(dto));
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Đăng nhập', description: 'Xác thực thông tin đăng nhập, trả về Access Token và đặt Refresh Token cookie. Được bảo vệ bởi Rate Limiting.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respondWithSession(response, await this.authService.login(dto));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Làm mới phiên (Refresh Token Rotation)', description: 'Đọc cookie taskflow_refresh, xoay vòng token trong database transaction, cấp Access Token mới và đặt cookie mới.' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      request.cookies?.[REFRESH_COOKIE],
    );
    return this.respondWithSession(response, result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Đăng xuất', description: 'Thu hồi phiên làm việc hiện tại và xóa cookie taskflow_refresh.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(request.cookies?.[REFRESH_COOKIE]);
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ người dùng hiện tại' })
  async me(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.id);
  }

  @Patch(['profile', 'me'])
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cập nhật hồ sơ cá nhân', description: 'Cập nhật tên hiển thị của người dùng. Yêu cầu Bearer JWT.' })
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(request.user.id, dto);
  }

  @Post('change-password')
  @UseGuards(AccessTokenGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đổi mật khẩu chủ động', description: 'Xác thực mật khẩu hiện tại bằng Argon2id, băm mật khẩu mới, và tự động thu hồi toàn bộ phiên làm việc khác.' })
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      request.user.id,
      dto,
      request.user.sessionId,
    );
  }

  private respondWithSession(response: Response, result: AuthResult) {
    response.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      maxAge: Math.max(
        0,
        result.sessionExpiresAt.getTime() - Date.now(),
      ),
    });
    return {
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/auth',
    };
  }
}
