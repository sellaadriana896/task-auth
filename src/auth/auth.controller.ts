import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  BadRequestException,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtCookieGuard } from './guards/jwt-cookie.guard';
import { ConfigService } from '@nestjs/config';
import { parseTtl } from '../common/ttl.util';
import { AuthLogService } from './auth-log.service';

type RequestWithExtras = Request & {
  fingerprint?: Record<string, unknown>;
  cookies?: Record<string, string>;
  user?: { id: number; email: string };
};

interface AuthResult {
  user: { id: number; email: string };
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string | undefined;
  refreshExpiresIn: string | undefined;
}

function getHeader(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase() as keyof typeof req.headers];
  if (Array.isArray(value)) return value.join(',');
  return typeof value === 'string' ? value : '';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly authLog: AuthLogService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto.email, dto.password);
    return { id: user.id, email: user.email };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: RequestWithExtras,
  ) {
    const fingerprintData = req.fingerprint as unknown;
    if (!fingerprintData) {
      throw new BadRequestException('Fingerprint unavailable');
    }

    const deviceId = createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
    let result: AuthResult;
    try {
      result = await this.auth.login(dto.email, dto.password, deviceId);
      try {
        await this.authLog.log('login.success', {
          email: dto.email,
          deviceId,
          ip:
            getHeader(req, 'x-forwarded-for') || req.socket.remoteAddress || '',
          ua: getHeader(req, 'user-agent'),
          userId: result.user.id,
        });
      } catch {
        // ignore logging errors
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : 'login failed';
      try {
        await this.authLog.log('login.fail', {
          email: dto.email,
          deviceId,
          ip:
            getHeader(req, 'x-forwarded-for') || req.socket.remoteAddress || '',
          ua: getHeader(req, 'user-agent'),
          reason,
        });
      } catch {
        // игнорируем ошибки логирования
      }
      throw err;
    }

    //очистк наследованного deviceId cookie
    res.clearCookie('deviceId', { path: '/' });
    // Синхронизация maxAge куки с TTL из .env
    const accessSec = parseTtl(this.config.get<string>('JWT_ACCESS_TTL'), 900); // 15m по умолчанию
    const refreshSec = parseTtl(
      this.config.get<string>('JWT_REFRESH_TTL'),
      30 * 24 * 60 * 60,
    ); // 30d по умолчанию
    const accessMs = accessSec * 1000;
    const refreshMs = refreshSec * 1000;

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: false, // требует https
      sameSite: 'strict',
      maxAge: accessMs,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: refreshMs,
    });

    return {
      user: result.user,
      accessExpiresIn: result.accessExpiresIn,
      refreshExpiresIn: result.refreshExpiresIn,
    };
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: RequestWithExtras,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fingerprintData = req.fingerprint as unknown;
    if (!fingerprintData) {
      throw new BadRequestException('Fingerprint unavailable');
    }
    const deviceId = createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');

    const headerCookie: string | undefined = req.headers.cookie;
    const headerToken = headerCookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('refreshToken='))
      ?.substring('refreshToken='.length);
    const refreshToken = dto.refreshToken || headerToken;
    if (!refreshToken) {
      throw new BadRequestException('Missing refresh token');
    }
    let result: AuthResult;
    try {
      result = await this.auth.refresh(refreshToken, deviceId);
      try {
        await this.authLog.log('refresh.success', {
          deviceId,
          ip:
            getHeader(req, 'x-forwarded-for') || req.socket.remoteAddress || '',
          ua: getHeader(req, 'user-agent'),
          userId: result.user.id,
        });
      } catch {
        // игнорируем ошбики логирования
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : 'refresh failed';
      try {
        await this.authLog.log('refresh.fail', {
          deviceId,
          ip:
            getHeader(req, 'x-forwarded-for') || req.socket.remoteAddress || '',
          ua: getHeader(req, 'user-agent'),
          reason,
        });
      } catch {
        // игнорируем ошбики логирования
      }
      throw err;
    }
    res.clearCookie('deviceId', { path: '/' });

    const accessSec = parseTtl(this.config.get<string>('JWT_ACCESS_TTL'), 900);
    const refreshSec = parseTtl(
      this.config.get<string>('JWT_REFRESH_TTL'),
      30 * 24 * 60 * 60,
    );
    const accessMs = accessSec * 1000;
    const refreshMs = refreshSec * 1000;

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: accessMs,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: refreshMs,
    });
    return {
      user: result.user,
      accessExpiresIn: result.accessExpiresIn,
      refreshExpiresIn: result.refreshExpiresIn,
    };
  }

  @Post('logout')
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: RequestWithExtras,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fingerprintData = req.fingerprint as unknown;
    if (!fingerprintData) {
      throw new BadRequestException('Fingerprint unavailable');
    }
    const deviceId = createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
    const headerCookie: string | undefined = req.headers.cookie;
    const headerToken = headerCookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('refreshToken='))
      ?.substring('refreshToken='.length);
    const refreshToken = headerToken;
    if (!refreshToken) {
      throw new BadRequestException('Missing refresh token');
    }

    await this.auth.logout(refreshToken, deviceId);
    try {
      await this.authLog.log('logout', {
        deviceId,
        ip: getHeader(req, 'x-forwarded-for') || req.socket.remoteAddress || '',
        ua: getHeader(req, 'user-agent'),
      });
    } catch {
      // игнорируем ошбики логирования
    }
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('deviceId', { path: '/' });
    return { success: true };
  }

  @Post('logout-all')
  async logoutAll(
    @Req() req: RequestWithExtras,
    @Res({ passthrough: true }) res: Response,
  ) {
    const headerCookie: string | undefined = req.headers.cookie;
    const headerToken = headerCookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('refreshToken'))
      ?.substring('refreshToken='.length);
    const refreshToken = headerToken;

    if (!refreshToken) {
      throw new BadRequestException('Missing refresh token');
    }

    await this.auth.logoutAll(refreshToken);
    try {
      await this.authLog.log('logoutAll', {
        ip: getHeader(req, 'x-forwarded-for') || req.socket.remoteAddress || '',
        ua: getHeader(req, 'user-agent'),
      });
    } catch {
      // игнорируем ошбики логирования
    }

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('deviceId', { path: '/' });
    return { success: true };
  }

  @UseGuards(JwtCookieGuard)
  @Get('me')
  me(@Req() req: RequestWithExtras) {
    //теперь req.user гуард
    return { user: req.user };
  }

  @Get('logs')
  async logs(@Query('limit') limit?: string) {
    const n = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 500);
    const items = await this.authLog.recent(n);
    return { items };
  }
}
