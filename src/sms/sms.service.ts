import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMS_SENDER } from './sms.tokens';

export type SmsSendOptions = {
  to: string | string[];
  text: string;
  from?: string;
};

type SmsSender = {
  send: (options: { to: string | string[]; text: string; from?: string }) => Promise<{ accepted: boolean; id?: string }>;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject(SMS_SENDER) private readonly sender: SmsSender,
    private readonly config: ConfigService,
  ) {}

  async send(options: SmsSendOptions): Promise<{ accepted: boolean; id?: string }> {
    const from = options.from || this.config.get<string>('SMS_FROM') || 'TaskAuth';
    this.logger.log(
      `Sending SMS via sender to=${Array.isArray(options.to) ? options.to.join(',') : options.to} text="${options.text}"`,
    );
    const res = await this.sender.send({ to: options.to, text: options.text, from });
    if (res.accepted) this.logger.log(`SMS sent id=${res.id || 'n/a'}`);
    else this.logger.warn('SMS send declined');
    return res;
  }
}
