import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { DeviceToken } from './device-token.entity';
import { User } from '../users/user.entity';
import { randomUUID as uuidv4 } from 'crypto'; 
import * as bcrypt from 'bcrypt'; 

function parseTtl(raw: string | undefined, fallbackSeconds: number): number {
    if (!raw) return fallbackSeconds;
    const match = raw.trim().match(/^(\d+)([smhd])?$/i);
    if (!match) return fallbackSeconds;
    const value = Number(match[1]);
    const unit = match[2]?.toLowerCase();
    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return value;
    }
}



@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        @InjectRepository(DeviceToken) private readonly deviceRepo: Repository<DeviceToken>,
    ) {}

    async refresh (refreshToken: string, deviceId?: string) { 
        let payload: any;
        try { 
            payload = this.jwt.verify(refreshToken, {
                secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch (e: any) {
            if (e?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Refresh token expired');
            }
            throw new UnauthorizedException('Invalid refresh token signature');
        }

    const userId: number = payload.sub; 
    const oldJti: string = payload.jti; 
    //контроль целостности пейлоада
    if (!userId || !oldJti) { 
        throw new UnauthorizedException ('Malformed refresh payload');
    }

    //для строгого разделения по утсройствам deviceid обязателен
    if (!deviceId) { 
        throw new UnauthorizedException ('Missing deviceId'); 
    }

    const record = await this.deviceRepo.findOne ({
        where: { user: { id: userId }, deviceId }, 
        relations: { user: true }, 
    }); 
    if (!record) {
        throw new UnauthorizedException ('Device token revoked'); 
    }

    if (record.isRevoked) { 
        throw new UnauthorizedException ('Device token revoked');
    }

    const now  = new Date(); 
    if (record.expireAt && record.expireAt.getTime() < now.getTime()) { 
        throw new UnauthorizedException ('Device token expired');
    }

    if (record.jti !== oldJti) { 
        throw new UnauthorizedException ('Refresh jti mismatch (rotated or invalid)')
    }


    //сверка хеша
    const hashMatches = await bcrypt.compare (refreshToken, record.refreshTokenHash);
    if (!hashMatches) { 
        throw new UnauthorizedException ('Invalid refresh token (hash mismatch)');
    }
    
    const user = record.user; 
    if (!user) { 
        throw new UnauthorizedException ('User not found'); 
    }

    // после всех проверк генерировые новый jti и пару токенов

    const newJti = uuidv4(); 
    const newAccessToken = this.generateAccessToken(user); 
    const newRefreshToken = this.generateRefreshToken(user, newJti); 
    const newHash = await this.hashRefreshToken (newRefreshToken);

    const rawTtl = this.config.get<string>('JWT_REFRESH_TTL'); 
    const ttlSeconds = parseTtl(rawTtl, 2592000); 
    const newExpireAt = new Date(now.getTime() + ttlSeconds * 1000); 

    record.jti = newJti; 
    record.refreshTokenHash = newHash; 
    record.lastUsedsAt = now; 
    record.expireAt = newExpireAt; 

    await this.deviceRepo.save (record);

    return {
        user: { id: user.id, email: user.email}, 
        accessToken: newAccessToken, 
        refreshToken: newRefreshToken, 
        accessExpiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
        refreshExpiresIn: this.config.get<string>('JWT_REFRESH_TTL'),
    };
    }

    private async hashRefreshToken (raw: string): Promise <string> { 
        //bcrypt.hash (исх.строка, соль)
        return bcrypt.hash (raw, 10); 
    }

    private async saveDeviceToken(user: User, deviceId: string, jti: string, refreshToken: string): Promise<DeviceToken> { 
        const hash = await this.hashRefreshToken (refreshToken);
        let record = await this.deviceRepo.findOne ({
            where: {user: { id: user.id}, deviceId},
            relations: { user: true},
        });

        const now = new Date();
        //ttl из env
        const rawTtl = this.config.get<string>('JWT_REFRESH_TTL');
        const ttlSeconds = parseTtl(rawTtl, 2592000);
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

            if (!record) {
                record = this.deviceRepo.create({
                    user,
                    deviceId,
                    jti,
                    refreshTokenHash: hash,
                    isRevoked: false,
                    lastUsedsAt: now,
                    expireAt: expiresAt,
                });
            } 
        
            else {
                record.jti = jti;
                record.refreshTokenHash = hash;
                record.isRevoked = false;
                record.lastUsedsAt = now;
                record.expireAt = expiresAt;
            }

        return this.deviceRepo.save(record);
    }

    async login(email: string, password: string, deviceId?: string) {
        const user = await this.validateUser(email, password);
        const jti = uuidv4();

        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user, jti);

        if (!deviceId) {
            throw new UnauthorizedException('Missing deviceId');
        }
        await this.saveDeviceToken(user, deviceId, jti, refreshToken);

        return {
            user: { id: user.id, email: user.email },
            accessToken,
            refreshToken,
            accessExpiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
            refreshExpiresIn: this.config.get<string>('JWT_REFRESH_TTL'),
        };
    }

    private buildAccessPayload(user: User) {
        return { sub: user.id, email: user.email };
    }

    generateAccessToken(user: User): string {
        const payload = this.buildAccessPayload(user);
        const secret = this.config.get<string>('JWT_ACCESS_SECRET')!;
        const raw = this.config.get<string>('JWT_ACCESS_TTL');
        const ttlSeconds = parseTtl(raw, 900);
        return this.jwt.sign(payload, { secret, expiresIn: ttlSeconds });
    }

    generateRefreshToken(user: User, jti: string): string {
        const payload = { sub: user.id, email: user.email, jti };
        const secret = this.config.get<string>('JWT_REFRESH_SECRET')!;
        const raw = this.config.get<string>('JWT_REFRESH_TTL');
        const ttlSeconds = parseTtl(raw, 2592000);
        return this.jwt.sign(payload, { secret, expiresIn: ttlSeconds });
    }

    async register(email: string, password: string): Promise<User> {
        const existing = await this.users.findByEmail(email);
        if (existing) throw new ConflictException('Email already in use');
        return this.users.createUser(email, password);
    }

    async validateUser(email: string, password: string): Promise<User> {
        const user = await this.users.findByEmail(email);
        if (!user) throw new UnauthorizedException('Invalid credentials');
        const ok = await this.users.validatePassword(password, user.passwordHash);
        if (!ok) throw new UnauthorizedException('Invalid credentials');
        return user;
    }

    async logout(refreshToken: string, deviceId: string): Promise<void> {
        let payload: any;
        try {
            payload = this.jwt.verify(refreshToken, {
                secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            return;
        }
        const userId = payload.sub;
        if (!userId) return;
        const record = await this.deviceRepo.findOne({
            where: { user: { id: userId }, deviceId },
            relations: { user: true },
        });
        if (!record) return;
        record.isRevoked = true;
        await this.deviceRepo.save(record);
    }

    async logoutAll(refreshToken: string): Promise<void> {
        let payload: any;
        try {
            payload = this.jwt.verify(refreshToken, {
                secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            return;
        }
        const userId = payload.sub;
        if (!userId) return;
        await this.deviceRepo.update({ user: { id: userId } }, { isRevoked: true });
    } 
}
