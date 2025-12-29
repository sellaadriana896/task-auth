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
import { EmailVerificationService } from './email-verification.service';
import { PhoneVerificationService } from './phone-verification.service';
import { MailService } from '../mail/mail.service';
import { MailQueueService } from '../mail/mail.queue.service';
import { SmsQueueService } from '../sms/sms.queue.service';
import { UsersService } from '../users/users.service';

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
    private readonly emailVerify: EmailVerificationService,
    private readonly mail: MailService,
    private readonly mailQueue: MailQueueService,
    private readonly phoneVerify: PhoneVerificationService,
    private readonly smsQueue: SmsQueueService,
    private readonly users: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto.email, dto.password, dto.phone);
    // если указан телефон — сохраним его (UsersService.createUser уже поддерживает), иначе email-путь
    if (dto.verificationMethod === 'sms' && dto.phone) {
      // выпустим код подтверждения и отправим SMS
      const { code } = await this.phoneVerify.issue(user.id, dto.phone);
      await this.smsQueue.enqueueSend({
        to: dto.phone,
        text: `Код подтверждения TaskAuth: ${code}`,
      });
      return { id: user.id, email: user.email, phone: dto.phone, phoneVerification: 'sent' };
    } else {
      // по умолчанию — email подтверждение
      const { token } = await this.emailVerify.issue(user.id, user.email);
      const appUrl =
        this.config.get<string>('APP_URL') ||
        `http://localhost:${process.env.PORT ?? 3000}`;
      const link = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;
      await this.mailQueue.enqueueSend({
        to: user.email,
        subject: 'Подтверждение email',
        text: `Для подтверждения почты перейдите по ссылке: ${link}`,
        html: `<p>Для подтверждения почты перейдите по ссылке:</p><p><a href="${link}">${link}</a></p>`,
      });
      return { id: user.id, email: user.email, emailVerification: 'sent' };
    }
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
        // игнорируем ошбики логирования
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

  @Get('verify')
  async verify(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('Missing token');
    const payload = await this.emailVerify.consume(token);
    if (!payload) {

      return { success: true, message: 'Почта уже подтверждена' };
    }
    await this.users.markEmailVerified(payload.userId);
    try {
      await (this.authLog as any).log('email.verify.success', {
        userId: payload.userId,
        email: payload.email,
      });
    } catch {}
    return { success: true };
  }

  @Post('verify-sms/request')
  async requestSms(@Body('phone') phone?: string, @Body('userId') userId?: number) {
    if (!phone || !userId) throw new BadRequestException('Missing phone or userId');
    const { code } = await this.phoneVerify.issue(userId, phone);
    await this.smsQueue.enqueueSend({ to: phone, text: `Код подтверждения TaskAuth: ${code}` });
    return { success: true };
  }

  @Post('verify-sms/confirm')
  async confirmSms(@Body('phone') phone?: string, @Body('code') code?: string) {
    if (!phone || !code) throw new BadRequestException('Missing phone or code');
    const res = await this.phoneVerify.consume(phone, code);
    if (!res) return { success: false, message: 'Неверный код или истёк срок действия' };
    await this.users.markPhoneVerified(res.userId);
    try {
      await (this.authLog as any).log('phone.verify.success', { userId: res.userId, phone });
    } catch {}
    return { success: true };
  }
}
