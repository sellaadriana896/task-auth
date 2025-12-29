import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { SmsService, type SmsSendOptions } from './sms.service';

@Controller()
export class SmsConsumer {
  private readonly logger = new Logger(SmsConsumer.name);
  constructor(private readonly sms: SmsService) {}

  @EventPattern('sms.send')
  async onSmsSend(@Payload() payload: SmsSendOptions, @Ctx() context: RmqContext) {
    this.logger.log(`Received sms job to=${Array.isArray(payload.to) ? payload.to.join(',') : payload.to}`);
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.sms.send(payload);
      channel.ack(originalMsg);
      this.logger.log('SMS job processed');
    } catch (e) {
      this.logger.error(`SMS job failed: ${e instanceof Error ? e.message : e}`);
      channel.nack(originalMsg, false, true);
    }
  }
}
