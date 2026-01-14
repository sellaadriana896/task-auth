import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { SendOptions } from './mail.service';

@Injectable()
export class MailQueueService {
  constructor(@Inject('MAIL_QUEUE') private readonly client: ClientProxy) {}

  async enqueueSend(options: SendOptions): Promise<void> {
    await lastValueFrom(this.client.emit('mail.send', options));
  }
}
