import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { SmsSendOptions } from './sms.service';

@Injectable()
export class SmsQueueService {
  constructor(@Inject('SMS_QUEUE') private readonly client: ClientProxy) {}

  async enqueueSend(options: SmsSendOptions): Promise<void> {
    await lastValueFrom(this.client.emit('sms.send', options));
  }
}
