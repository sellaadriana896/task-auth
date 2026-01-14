import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class RmqServerOptionsService {
  constructor(private readonly config: ConfigService) {}
  getOptions(): MicroserviceOptions {
    const url = this.config.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
    const queue = this.config.get<string>('RABBITMQ_QUEUE') || 'mail_queue';
    return {
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue,
        queueOptions: { durable: true },
        prefetchCount: 1,
        noAck: false,
      },
    };
  }
}

@Module({
  imports: [ConfigModule],
  providers: [RmqServerOptionsService],
  exports: [RmqServerOptionsService],
})
export class RabbitServerModule {}
