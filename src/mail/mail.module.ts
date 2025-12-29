import { DynamicModule, Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { MailConsumer } from './mail.consumer';
import { MailQueueService } from './mail.queue.service';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MAIL_TRANSPORT } from './mail.tokens';
import { RabbitModule } from '../common/rabbit/rabbit.module';

@Global()
@Module({})
export class MailModule {
  static forRoot(): DynamicModule {
    return {
      module: MailModule,
      imports: [ConfigModule, RabbitModule.forFeature([{ name: 'MAIL_QUEUE' }])],
      controllers: [MailController, MailConsumer],
      providers: [
        {
          provide: MAIL_TRANSPORT,
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            const driver = (config.get<string>('MAIL_DRIVER') || 'smtp').toLowerCase();

            if (driver === 'ethereal') {
              const testAccount = await nodemailer.createTestAccount();
              return nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
              });
            }

            if (driver === 'json') {
              return nodemailer.createTransport({ jsonTransport: true });
            }

            const host = config.get<string>('SMTP_HOST');
            const port = Number(config.get<string>('SMTP_PORT') || 587);
            const secure = (config.get<string>('SMTP_SECURE') || 'false') === 'true';
            const user = config.get<string>('SMTP_USER');
            const pass = config.get<string>('SMTP_PASS');

            return nodemailer.createTransport({
              host,
              port,
              secure,
              pool: true,
              maxConnections: 1,
              auth: user && pass ? { user, pass } : undefined,
            });
          },
        },
        MailService,
        MailQueueService,
      ],
      exports: [MailService, MailQueueService],
    };
  }
}
