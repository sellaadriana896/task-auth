import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DeviceToken } from './device-token.entity';
import { UsersModule } from '../users/users.module';
import { JwtCookieGuard } from './guards/jwt-cookie.guard';


@Module({
  imports: [
    ConfigModule,
    UsersModule,
    TypeOrmModule.forFeature([DeviceToken]),
    JwtModule.registerAsync({
      imports: [UsersModule, ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const raw = config.get<string>('JWT_ACCESS_TTL') ?? '900';
        const ttlSeconds = Number(raw.replace(/[^0-9]/g, '')) || 900;
        return {
          secret: config.get<string>('JWT_ACCESS_SECRET'),
          signOptions: { expiresIn: ttlSeconds},
        }
      }    
    })
  ],
  providers: [AuthService, JwtCookieGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtCookieGuard],
})
export class AuthModule {}
