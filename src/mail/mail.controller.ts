import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailQueueService } from './mail.queue.service';
import { IsEmail, IsOptional, IsString } from 'class-validator';

class TestMailDto {
	@IsEmail()
	to!: string;

	@IsOptional()
	@IsString()
	subject?: string;

	@IsOptional()
	@IsString()
	text?: string;
}

@Controller('mail')
export class MailController {
	constructor(private readonly mail: MailService, private readonly queue: MailQueueService) {}

	@Post('test')
	@HttpCode(200)
	async test(@Body() dto: TestMailDto) {
		const res = await this.mail.send({
			to: dto.to,
			subject: dto.subject || 'Test message',
			text: dto.text || 'Hello from task-auth!',
		});
		return res;
	}

	@Post('queue')
	@HttpCode(202)
	async queueSend(@Body() dto: TestMailDto) {
		await this.queue.enqueueSend({
			to: dto.to,
			subject: dto.subject || 'Queued message',
			text: dto.text || 'Queued email from task-auth',
		});
		return { queued: true };
	}
}
