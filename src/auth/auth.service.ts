import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt'; // или 'bcryptjs'
import { UsersService } from '../users/users.service';
import { DeviceToken } from './device-token.entity';
import { User } from '../users/user.entity';



@Injectable()
export class AuthService {
    constructor (
        private readonly usersService: UsersService, 
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        @InjectRepository (DeviceToken)
        private readonly deviceRepo: Repository<DeviceToken>,
) {}

private buildAccessPayload(user: User) { 
    return {sub: user.id, email: user.email };
}

generatedAccessToken(user: User): string { 
    const payload = this.buildAccessPayload(user); 
    return this.jwt.sign (payload);
}

generateRefreshToken(user: User, jti: string): string { 
    const payload = { sub: user.id, email: user.email, jti};
    const secret = this.config.get<string>('JWT-REFRESH_SECRET')!;
    const expiresIn = this.config.get<string>('JWT_REFRESH_TTL')?? '30d';
    return this.jwt.sign (payload, { secret, expiresIn});
}

async register(email: string, password: string): Promise<User> {
    const existing = await this.users.findByEmail(email);
    if (existing) { 
        throw new ConflictException('Email already in use');
    }
    return this.users.createUser(email.password);
}

async validateUser(email: string, password: string): Promise <User> { 
    const user = await this.users.findByEmail(email); 
    if (!user) throw new UnauthorizedException ('Invalid credentials');
    const ok = await this.users.validatePassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException ('Invalid credentials');
    return user;
    }
}
