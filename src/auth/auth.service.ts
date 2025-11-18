import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { DeviceToken } from './device-token.entity';
import { User } from '../users/user.entity';
import {v4 as uuidv4} from 'uuid'; 
import * as bcrypt from 'bcrypt'; 



@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        @InjectRepository(DeviceToken) private readonly deviceRepo: Repository<DeviceToken>,
    ) {}

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
        const rawTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '2592000';
        const ttlSeconds = Number(rawTtl.replace(/[^0-9]/g,'')) || 2592000;
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
        const finalDeviceId = deviceId || uuidv4();
        const jti = uuidv4();

        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user, jti);

        await this.saveDeviceToken(user, finalDeviceId, jti, refreshToken);

        return {
            user: { id: user.id, email: user.email },
            deviceId: finalDeviceId,
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
        return this.jwt.sign(this.buildAccessPayload(user));
    }

    generateRefreshToken(user: User, jti: string): string {
        const payload = { sub: user.id, email: user.email, jti };
        // В .env используется ключ JWT_REFRESH_SECRET (без дефиса)
        const secret = this.config.get<string>('JWT_REFRESH_SECRET')!;
        const raw = this.config.get<string>('JWT_REFRESH_TTL') ?? '2592000'; // 30 дней (секунды)
        const ttl = Number(raw.replace(/[^0-9]/g, '')) || 2592000;
        return this.jwt.sign(payload, { secret, expiresIn: ttl });
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
}
