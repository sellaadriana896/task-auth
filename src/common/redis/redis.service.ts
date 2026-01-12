import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    const host = this.config.get<string>('REDIS_HOST') || 'localhost';
    const port = Number(this.config.get<string>('REDIS_PORT') || 6379);

    this.client = createClient({ url: url || `redis://${host}:${port}` });
    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }

  getClient() {
    return this.client;
  }

  async xaddTrimmed(
    key: string,
    maxLen: number,
    fields: Record<string, string>,
  ) {
    const map: Record<string, any> = { ...fields };
    return (this.client as any).xAdd(key, '*', map, {
      TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: maxLen },
    });
  }
}
