import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { SmsService } from './sms.service';
import { SmsQueueService } from './sms.queue.service';

class TestSmsDto {
  @IsString()
  to!: string; // упрощённо: одиночный номер, можно поддержать список через запятую

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  from?: string;
}

@Controller('sms')
export class SmsController {
  constructor(private readonly sms: SmsService, private readonly queue: SmsQueueService) {}

  @Post('test')
  @HttpCode(200)
  async test(@Body() dto: TestSmsDto) {
    const res = await this.sms.send({ to: dto.to, text: dto.text, from: dto.from });
    return res;
  }

  @Post('queue')
  @HttpCode(202)
  async queueSend(@Body() dto: TestSmsDto) {
    await this.queue.enqueueSend({ to: dto.to, text: dto.text, from: dto.from });
    return { queued: true };
  }
}
