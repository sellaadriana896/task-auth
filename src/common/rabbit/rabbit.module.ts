import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

type RmqClientDef = { name: string; queue?: string };

@Module({})
export class RabbitModule {
  static forFeature(clients: RmqClientDef[]): DynamicModule {
    return {
      module: RabbitModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync(
          clients.map((c) => ({
            name: c.name,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
              const url = config.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
              const queue = c.queue || config.get<string>('RABBITMQ_QUEUE') || 'mail_queue';
              return {
                transport: Transport.RMQ,
                options: {
                  urls: [url],
                  queue,
                  queueOptions: { durable: true },
                  persistent: true,
                  // reply-consumer на клиенте — noAck: true
                  noAck: true,
                },
              };
            },
          }))
        ),
      ],
      exports: [ClientsModule],
    };
  }
}
