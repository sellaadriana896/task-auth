import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

type AuthEventType =
  | 'login.success'
  | 'login.fail'
  | 'refresh.success'
  | 'refresh.fail'
  | 'logout'
  | 'logoutAll';

@Injectable()
export class AuthLogService {
  private readonly streamKey = 'auth:events';
  private readonly maxLen = 10000;

  constructor(private readonly redis: RedisService) {}

  async log(type: AuthEventType, data: Record<string, any>) {
    const flat: Record<string, string> = {
      type,
      ts: new Date().toISOString(),
    };
    for (const [k, v] of Object.entries(data)) {
      try {
        flat[k] = typeof v === 'string' ? v : JSON.stringify(v);
      } catch {
        flat[k] = String(v);
      }
    }
    await this.redis.xaddTrimmed(this.streamKey, this.maxLen, flat);
  }

  async recent(
    limit = 50,
  ): Promise<Array<{ id: string; [k: string]: string }>> {
    const client = this.redis.getClient();
    const entries = await client.xRevRange(this.streamKey, '+', '-', {
      COUNT: limit,
    });
    return entries.map(
      (e: { id: string; message: Record<string, string> }) => ({
        id: e.id,
        ...e.message,
      }),
    );
  }
}
