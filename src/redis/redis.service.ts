import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const options: RedisOptions = { lazyConnect: true };
    this.client = new Redis(url, options);
    this.client.on('error', (err) => this.logger.error(`Redis error: ${String(err)}`));
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('ready', () => this.logger.log('Redis ready'));
    this.client.on('end', () => this.logger.warn('Redis connection closed'));
    this.client.connect().catch((err) => this.logger.error(`Redis connect failed: ${String(err)}`));
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async set(key: string, value: string, ttlSec?: number): Promise<'OK' | null> {
    if (ttlSec && ttlSec > 0) {
      return this.client.set(key, value, 'EX', ttlSec);
    }
    return this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.quit().catch(() => this.client.disconnect());
    }
  }
}
