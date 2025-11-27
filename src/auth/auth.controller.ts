import { Controller, Post, Body, Req, Res, BadRequestException, UseGuards, Get } from '@nestjs/common';
import type { Response, Request } from 'express';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto'; 
import { JwtCookieGuard } from './guards/jwt-cookie.guard';
import { ConfigService } from '@nestjs/config';
import { parseTtl } from '../common/ttl.util'

@Controller('auth')
export class AuthController {
    constructor(
        private readonly auth: AuthService,
        private readonly config: ConfigService,
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
        @Req() req: Request,
    ) {
        const fingerprintData = req['fingerprint'];
        if (!fingerprintData) {
            throw new BadRequestException('Fingerprint unavailable');
        }
        
        const deviceId = createHash('sha256')
            .update(JSON.stringify(fingerprintData))
            .digest('hex');

        const result = await this.auth.login(dto.email, dto.password, deviceId);

        //очистк наследованного deviceId cookie
        res.clearCookie('deviceId', { path: '/' });
        // Синхронизация maxAge куки с TTL из .env
        const accessSec = parseTtl(this.config.get<string>('JWT_ACCESS_TTL'), 900); // 15m по умолчанию
        const refreshSec = parseTtl(this.config.get<string>('JWT_REFRESH_TTL'), 30 * 24 * 60 * 60); // 30d по умолчанию
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
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const fingerprintData = req['fingerprint'];
        if (!fingerprintData) {
            throw new BadRequestException('Fingerprint unavailable');
        }
        const deviceId = createHash('sha256')
            .update(JSON.stringify(fingerprintData))
            .digest('hex');

        const incomingCookie = (req as any).cookies?.refreshToken;
        const headerCookie: string | undefined = (req.headers as any)?.cookie;
        const headerToken = headerCookie
            ?.split(';')
            .map((s) => s.trim())
            .find((s) => s.startsWith('refreshToken='))
            ?.substring('refreshToken='.length);
        const refreshToken = dto.refreshToken || incomingCookie || headerToken;
        if (!refreshToken) {
            throw new BadRequestException('Missing refresh token');
        }
        const result = await this.auth.refresh(refreshToken, deviceId);
        res.clearCookie('deviceId', { path: '/' });

        const accessSec = parseTtl(this.config.get<string>('JWT_ACCESS_TTL'), 900);
        const refreshSec = parseTtl(this.config.get<string>('JWT_REFRESH_TTL'), 30 * 24 * 60 * 60);
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
        @Req() req: Request, 
        @Res({ passthrough: true }) res: Response,
    ) {
        const fingerprintData = req['fingerprint'];
        if (!fingerprintData) {
            throw new BadRequestException('Fingerprint unavailable');
        }
        const deviceId = createHash('sha256')
            .update(JSON.stringify(fingerprintData))
            .digest('hex');
        const incomingCookie = (req as any).cookies?.refreshToken;
        const headerCookie: string | undefined = (req.headers as any)?.cookie;
        const headerToken = headerCookie
            ?.split(';')
            .map((s) => s.trim())
            .find((s) => s.startsWith('refreshToken='))
            ?.substring('refreshToken='.length);
        const refreshToken = incomingCookie || headerToken;
        if (!refreshToken) {
            throw new BadRequestException('Missing refresh token');
        }

        await this.auth.logout(refreshToken, deviceId);
        res.clearCookie('accessToken', { httpOnly: true, secure: false, sameSite: 'strict', path: '/' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: false, sameSite: 'strict', path: '/' });
        res.clearCookie('deviceId', { path: '/' });
        return { success: true };
    }
    

    @Post('logout-all')
    async logoutAll(@Req() req: Request, @Res ({passthrough: true}) res: Response) 
    {
        const incomingCookie = (req as any).cookies?.refreshToken; 
        const headerCookie: string | undefined = (req.headers as any)?.cookie;
        const headerToken =  headerCookie 
            ?.split(';')
            .map((s) => s.trim())
            .find((s) => s.startsWith('refreshToken'))
            ?.substring('refreshToken='.length);
        const refreshToken = incomingCookie || headerToken;

        if (!refreshToken) { 
            throw new BadRequestException('Missing refresh token');
        }

        await this.auth.logoutAll (refreshToken);

        res.clearCookie('accessToken', { httpOnly: true, secure: false, sameSite: 'strict', path: '/' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: false, sameSite: 'strict', path: '/' });
        res.clearCookie('deviceId', { path: '/' });
        return { success: true };
    }


    @UseGuards(JwtCookieGuard)
    @Get('me')
    async me (@Req() req: Request) { 
        //теперь req.user гуард 
        return { user: req ['user']};
    }
}
