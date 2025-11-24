import { Controller, Post, Body, Req, Res, BadRequestException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto'; 



@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

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
        const deviceId = createHash('sha256').update(JSON.stringify(fingerprintData)).digest('hex');

        const result = await this.auth.login(dto.email, dto.password, deviceId);

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        return {
            user: result.user,
            deviceId: result.deviceId,
            accessToken: result.accessToken,
            accessExpiresIn: result.accessExpiresIn,
        };
    }

    @Post('refresh')
    async refresh(
        @Body() dto: RefreshDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const incomingCookie = (req as any).cookies?.refreshToken; // иногда тип не содержит печенья
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
        const deviceId = dto.deviceId;
        const result = await this.auth.refresh(refreshToken, deviceId);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        return {
            user: result.user,
            deviceId: result.deviceId,
            accessToken: result.accessToken,
            accessExpiresIn: result.accessExpiresIn,
        };
    }

    @Post('logout')
    async logout(
        @Body() dto: LogoutDto,
        @Req() req: Request, 
        @Res({ passthrough: true }) res: Response,
    ) {
        const incomingCookie = (req as any).cookies?.refreshToken;
        const headerCookie: string | undefined = (req.headers as any)?.cookie;
        const headerToken = headerCookie
            ?.split(';')
            .map((s) => s.trim())
            .find((s) => s.startsWith('refreshToken='))
            ?.substring('refreshToken='.length);
        const refreshToken = incomingCookie || headerToken;

        const deviceId =dto.deviceId;

        await this.auth.logout(refreshToken, deviceId);

        res.clearCookie('refreshToken',
            {
                httpOnly: true,
                secure: false, 
                sameSite: 'strict',
                path: '/',
            });
        
        return { success: true };
    }
    

    @Post('logout-all')
    async logoutAll(@Req() req: Request, @Res ({passthrough: true}) res: Response) 
    {
        const incomingCookie = (req as any).cookies?.refreshToken; 
        const headerCookie: string | undefined = (req.headers as any)?.cookie;
        const headerToken =  headerCookie 
            ?.split(';')
            .map((s) => s.trim)
            .find((s) => s.startsWith('refreshToken'))
            ?.substring('refreshToken='.length);
        const refreshToken = incomingCookie || headerToken;

        if (!refreshToken) { 
            throw new BadRequestException('Missing refresh token');
        }

        await this.auth.logoutAll (refreshToken);

        res.clearCookie('refreshToken', { 
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            path: '/',
        });
        return { success: true };
    }

}
