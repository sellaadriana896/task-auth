import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    let token: string | undefined = req.cookies?.accessToken;
    if (!token) {
      const auth = req.headers['authorization'];
      if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        token = auth.substring(7).trim();
      }
    }

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch (e: any) {
      if (e?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token expired');
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
