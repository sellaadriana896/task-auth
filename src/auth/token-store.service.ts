import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

type DeviceRecord = {
  userId: number;
  deviceId: string;
  jti: string;
  refreshTokenHash: string;
  isRevoked: boolean;
  lastUsedAt: string; // ISO
  expireAt: string; // ISO
  ip?: string | null;
  ua?: string | null;
};

@Injectable()
export class TokenStoreService {
  constructor(private readonly redis: RedisService) {}

  private keyDevice(userId: number, deviceId: string) {
    return `auth:device:${userId}:${deviceId}`;
  }

  private keyUserDevices(userId: number) {
    return `auth:user-devices:${userId}`;
  }

  private ttlSeconds(expireAtIso: string) {
    const expire = new Date(expireAtIso).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, expire - now);
    return Math.ceil(diffMs / 1000);
  }

  async save(record: DeviceRecord) {
    const client = this.redis.getClient();
    const key = this.keyDevice(record.userId, record.deviceId);
    await client.hSet(key, {
      userId: String(record.userId),
      deviceId: record.deviceId,
      jti: record.jti,
      refreshTokenHash: record.refreshTokenHash,
      isRevoked: record.isRevoked ? '1' : '0',
      lastUsedAt: record.lastUsedAt,
      expireAt: record.expireAt,
      ip: record.ip ?? '',
      ua: record.ua ?? '',
    });
    await client.expire(key, this.ttlSeconds(record.expireAt));
    await client.sAdd(this.keyUserDevices(record.userId), record.deviceId);
  }

  async get(userId: number, deviceId: string): Promise<DeviceRecord | null> {
    const client = this.redis.getClient();
    const key = this.keyDevice(userId, deviceId);
    const data = await client.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return null;
    return {
      userId,
      deviceId,
      jti: data.jti ?? '',
      refreshTokenHash: data.refreshTokenHash ?? '',
      isRevoked: (data.isRevoked ?? '0') === '1',
      lastUsedAt: data.lastUsedAt ?? new Date().toISOString(),
      expireAt: data.expireAt ?? new Date().toISOString(),
      ip: data.ip || null,
      ua: data.ua || null,
    };
  }

  async updateOnRefresh(
    userId: number,
    deviceId: string,
    jti: string,
    refreshTokenHash: string,
    expireAtIso: string,
  ) {
    const client = this.redis.getClient();
    const key = this.keyDevice(userId, deviceId);
    await client.hSet(key, {
      jti,
      refreshTokenHash,
      lastUsedAt: new Date().toISOString(),
      expireAt: expireAtIso,
      isRevoked: '0',
    });
    await client.expire(key, this.ttlSeconds(expireAtIso));
  }

  async revoke(userId: number, deviceId: string) {
    const client = this.redis.getClient();
    const key = this.keyDevice(userId, deviceId);
    await client.del(key);
    await client.sRem(this.keyUserDevices(userId), deviceId);
  }

  async revokeAll(userId: number) {
    const client = this.redis.getClient();
    const setKey = this.keyUserDevices(userId);
    const deviceIds = await client.sMembers(setKey);
    if (deviceIds.length > 0) {
      const keys = deviceIds.map((d) => this.keyDevice(userId, d));
      await client.del(keys);
    }
    await client.del(setKey);
  }
}
