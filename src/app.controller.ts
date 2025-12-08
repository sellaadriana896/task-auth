import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly redis: RedisService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/redis')
  async healthRedis(): Promise<{ ping: string }> {
    const ping = await this.redis.ping();
    return { ping };
  }
}
