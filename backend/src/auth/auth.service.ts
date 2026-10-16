import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const SESSION_TTL_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;
const dummyPasswordHash = argon2.hash(randomBytes(32).toString('hex'), {
  type: argon2.argon2id,
});

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  sessionExpiresAt: Date;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name?.trim() || null,
        },
        select: { id: true, email: true, name: true },
      });
      return this.startSession(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
    const passwordMatches = await argon2.verify(passwordHash, dto.password);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    return this.startSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  }

  async refresh(rawToken: string | undefined): Promise<AuthResult> {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const tokenHash = this.hashToken(rawToken);
    const nextRawToken = this.createRefreshToken();
    const nextTokenHash = this.hashToken(nextRawToken);
    const now = new Date();
    let user: AuthUser | undefined;
    let sessionId: string | undefined;
    let sessionExpiresAt: Date | undefined;

    await this.prisma.$transaction(async (transaction) => {
      const token = await transaction.refreshToken.findUnique({
        where: { tokenHash },
        include: { session: { include: { user: true } } },
      });

      if (!token) {
        return;
      }

      if (token.revokedAt || token.session.revokedAt) {
        if (!token.session.revokedAt) {
          await transaction.authSession.update({
            where: { id: token.sessionId },
            data: { revokedAt: now },
          });
        }
        return;
      }

      if (token.session.expiresAt <= now) {
        return;
      }

      const revoked = await transaction.refreshToken.updateMany({
        where: { id: token.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) {
        await transaction.authSession.update({
          where: { id: token.sessionId },
          data: { revokedAt: now },
        });
        return;
      }

      await transaction.refreshToken.create({
        data: { sessionId: token.sessionId, tokenHash: nextTokenHash },
      });
      user = {
        id: token.session.user.id,
        email: token.session.user.email,
        name: token.session.user.name,
      };
      sessionId = token.sessionId;
      sessionExpiresAt = token.session.expiresAt;
    });

    if (!user || !sessionId || !sessionExpiresAt) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    return {
      ...(await this.createAccessToken(user, sessionId)),
      refreshToken: nextRawToken,
      sessionId,
      sessionExpiresAt,
      user,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      select: { sessionId: true },
    });
    if (!token) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: { id: token.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new UnauthorizedException('Account is no longer available.');
    }
    return user;
  }

  private async startSession(user: AuthUser): Promise<AuthResult> {
    const refreshToken = this.createRefreshToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MILLISECONDS);

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        expiresAt,
        refreshTokens: {
          create: { tokenHash: this.hashToken(refreshToken) },
        },
      },
      select: { id: true },
    });

    return {
      ...(await this.createAccessToken(user, session.id)),
      refreshToken,
      sessionId: session.id,
      sessionExpiresAt: expiresAt,
      user,
    };
  }

  private async createAccessToken(
    user: AuthUser,
    sessionId: string,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      sid: sessionId,
      tokenUse: 'access',
    });
    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  private createRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
