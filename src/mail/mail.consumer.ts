import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { MailService } from './mail.service';
import type { SendOptions } from './mail.service';

@Controller()
export class MailConsumer {
  private readonly logger = new Logger(MailConsumer.name);
  constructor(private readonly mail: MailService) {}

  @EventPattern('mail.send')
  async onMailSend(@Payload() payload: SendOptions, @Ctx() context: RmqContext) {
    this.logger.log(`Received mail job to=${Array.isArray(payload.to) ? payload.to.join(',') : payload.to}`);
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.mail.send(payload);
      channel.ack(originalMsg);
      this.logger.log('Mail job processed');
    } catch (e) {
      this.logger.error(`Mail job failed: ${e instanceof Error ? e.message : e}`);
      // requeue
      channel.nack(originalMsg, false, true);
    }
  }
}
