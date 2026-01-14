import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';
import { parseTtl } from '../common/ttl.util';

type PhoneTokenPayload = {
  userId: number;
  phone: string;
  code: string; // 6-значный код
};

function generateCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

@Injectable()
export class PhoneVerificationService {
  constructor(private readonly redis: RedisService, private readonly config: ConfigService) {}

  private keyByPhone(phone: string) {
    return `auth:verify-phone:phone:${phone}`;
  }

  private keyByUser(userId: number) {
    return `auth:verify-phone:user:${userId}`;
  }

  async issue(userId: number, phone: string) {
    const client = this.redis.getClient();

    // Удалим старую привязку, если была
    const oldCode = await client.get(this.keyByUser(userId));
    if (oldCode) {
      await client.del(this.keyByPhone(phone));
    }

    const code = generateCode();
    const rawTtl = this.config.get<string>('PHONE_VERIFY_TTL') ?? '10m';
    const ttlSeconds = parseTtl(rawTtl, 10 * 60);

    const payload: PhoneTokenPayload = { userId, phone, code };
    await client.hSet(this.keyByPhone(phone), {
      userId: String(payload.userId),
      phone: payload.phone,
      code: payload.code,
    });
    await client.expire(this.keyByPhone(phone), ttlSeconds);
    await client.set(this.keyByUser(userId), code, { EX: ttlSeconds });

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return { code, expiresAt };
  }

  async consume(phone: string, code: string): Promise<{ userId: number } | null> {
    const client = this.redis.getClient();
    const key = this.keyByPhone(phone);
    const data = await client.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return null;
    const valid = data.code === code;
    if (!valid) return null;
    const userId = Number(data.userId);

    // cleanup
    await client.del(key);
    await client.del(this.keyByUser(userId));
    return { userId };
  }
}
