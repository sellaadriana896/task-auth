import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import { parseTtl } from '../common/ttl.util';

type TokenPayload = {
  userId: number;
  email: string;
};

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private keyByToken(token: string) {
    return `auth:verify-email:token:${token}`;
  }

  private keyByUser(userId: number) {
    return `auth:verify-email:user:${userId}`;
  }

  async issue(userId: number, email: string) {
    const client = this.redis.getClient();
    const old = await client.get(this.keyByUser(userId));
    if (old) {
      await client.del(this.keyByToken(old));
    }

    const token = randomUUID();
    const rawTtl = this.config.get<string>('EMAIL_VERIFY_TTL') ?? '24h';
    const ttlSeconds = parseTtl(rawTtl, 24 * 3600);

    const payload: TokenPayload = { userId, email };
    await client.hSet(this.keyByToken(token), {
      userId: String(payload.userId),
      email: payload.email,
    });
    await client.expire(this.keyByToken(token), ttlSeconds);
    await client.set(this.keyByUser(userId), token, { EX: ttlSeconds });

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return { token, expiresAt };
  }

  async consume(token: string): Promise<TokenPayload | null> {
    const client = this.redis.getClient();
    const key = this.keyByToken(token);
    const data = await client.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return null;
    const userId = Number(data.userId);
    const email = data.email as string;
    // cleanup
    await client.del(key);
    await client.del(this.keyByUser(userId));
    return { userId, email };
  }
}
