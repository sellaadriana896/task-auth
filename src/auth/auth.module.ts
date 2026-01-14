import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtCookieGuard } from './guards/jwt-cookie.guard';
import { AuthLogModule } from './auth-log.module';
import { TokenStoreService } from './token-store.service';
import { EmailVerificationService } from './email-verification.service';
import { MailModule } from '../mail/mail.module';
import { PhoneVerificationService } from './phone-verification.service';

@Module({
  imports: [
    ConfigModule,
    AuthLogModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [UsersModule, ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const raw = config.get<string>('JWT_ACCESS_TTL') ?? '900';
        const ttlSeconds = Number(raw.replace(/[^0-9]/g, '')) || 900;
        return {
          secret: config.get<string>('JWT_ACCESS_SECRET'),
          signOptions: { expiresIn: ttlSeconds },
        };
      },
    }),
  ],
  providers: [AuthService, JwtCookieGuard, TokenStoreService, EmailVerificationService, PhoneVerificationService],
  controllers: [AuthController],
  exports: [AuthService, JwtCookieGuard, JwtModule],
})
export class AuthModule {}
