import { DynamicModule, Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitModule } from '../common/rabbit/rabbit.module';
import { SMS_SENDER } from './sms.tokens';
import { SmsService } from './sms.service';
import { SmsQueueService } from './sms.queue.service';
import { SmsConsumer } from './sms.consumer';
import { SmsController } from './sms.controller';

type SmsSender = {
  send: (options: { to: string | string[]; text: string; from?: string }) => Promise<{ accepted: boolean; id?: string }>;
};

@Global()
@Module({})
export class SmsModule {
  static forRoot(): DynamicModule {
    return {
      module: SmsModule,
      imports: [ConfigModule, RabbitModule.forFeature([{ name: 'SMS_QUEUE', queue: 'sms_queue' }])],
      controllers: [SmsController, SmsConsumer],
      providers: [
        {
          provide: SMS_SENDER,
          inject: [ConfigService],
          useFactory: async (config: ConfigService): Promise<SmsSender> => {
            const driver = (config.get<string>('SMS_DRIVER') || 'log').toLowerCase();

            if (driver === 'log') {
              return {
                async send({ to, text, from }) {
                  const list = Array.isArray(to) ? to.join(',') : to;
                  // Логируем как «отправлено», для дев-окружения
                  console.log(`[SMS LOG] from=${from || 'no-reply'} to=${list} text="${text}"`);
                  return { accepted: true, id: `${Date.now()}` };
                },
              };
            }

            // Заглушка для будущих драйверов (twilio, http и пр.)
            return {
              async send({ to, text }) {
                console.warn(`SMS driver "${driver}" не реализован. Сообщение не отправлено. to=${Array.isArray(to) ? to.join(',') : to}`);
                return { accepted: false };
              },
            };
          },
        },
        SmsService,
        SmsQueueService,
      ],
      exports: [SmsService, SmsQueueService],
    };
  }
}
