import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { MAIL_TRANSPORT } from './mail.tokens';

export type SendOptions = {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	from?: string;
};

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name);

	constructor(
		@Inject(MAIL_TRANSPORT) private readonly transport: Transporter,
		private readonly config: ConfigService,
	) {}

	async verify(): Promise<void> {
		try {
			await this.transport.verify();
			this.logger.log('Mail transport is ready');
		} catch (e) {
			this.logger.warn(`Mail transport verify failed: ${e}`);
		}
	}

	async send(options: SendOptions): Promise<{ messageId: string; previewUrl?: string | false }> {
		const from = options.from || this.config.get<string>('MAIL_FROM') || 'no-reply@example.com';

		this.logger.log(
			`Sending mail via transport to=${Array.isArray(options.to) ? options.to.join(',') : options.to} subject="${options.subject}"`,
		);

		const info = await this.transport.sendMail({
			from,
			to: Array.isArray(options.to) ? options.to.join(',') : options.to,
			subject: options.subject,
			text: options.text,
			html: options.html,
		});

		this.logger.log(`Mail sent messageId=${info.messageId}`);
		const url = nodemailer.getTestMessageUrl(info);
		if (url) this.logger.log(`Preview email at: ${url}`);
		return { messageId: info.messageId, previewUrl: url };
	}
}
