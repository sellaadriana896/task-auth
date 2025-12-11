import { Module } from '@nestjs/common';
import { AuthLogService } from './auth-log.service';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [AuthLogService],
  exports: [AuthLogService],
})
export class AuthLogModule {}
