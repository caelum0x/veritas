// Email sender service that dispatches messages via a pluggable transport

import { type Result, ok, err } from "@veritas/core";
import type { EmailMessage, SentEmail } from "./email.js";
import type { EmailTransport, EmailTransportOptions } from "./transport.js";
import type { EmailTemplate } from "./template.js";
import { emailSendFailed, emailRenderFailed, type EmailError } from "./errors.js";

export interface SendTemplateOptions<T extends Record<string, unknown>> {
  readonly template: EmailTemplate<T>;
  readonly data: T;
  readonly to: string | readonly string[];
  readonly from: string;
  readonly replyTo?: string;
  readonly cc?: string | readonly string[];
  readonly bcc?: string | readonly string[];
  readonly headers?: Readonly<Record<string, string>>;
  readonly transportOptions?: EmailTransportOptions;
}

export class EmailSender {
  constructor(private readonly transport: EmailTransport) {}

  async send(
    message: EmailMessage,
    options?: EmailTransportOptions
  ): Promise<Result<SentEmail, EmailError>> {
    try {
      return await this.transport.send(message, options);
    } catch (cause) {
      return err(emailSendFailed(`Unexpected error sending email via ${this.transport.name}`, cause));
    }
  }

  async sendTemplate<T extends Record<string, unknown>>(
    options: SendTemplateOptions<T>
  ): Promise<Result<SentEmail, EmailError>> {
    const { template, data, to, from, replyTo, cc, bcc, headers, transportOptions } = options;

    let subject: string;
    let html: string;
    let text: string;

    try {
      subject = template.subject(data);
      html = template.html(data);
      text = template.text(data);
    } catch (cause) {
      return err(emailRenderFailed(template.name, cause));
    }

    const message: EmailMessage = {
      to,
      from,
      ...(replyTo !== undefined ? { replyTo } : {}),
      ...(cc !== undefined ? { cc } : {}),
      ...(bcc !== undefined ? { bcc } : {}),
      ...(headers !== undefined ? { headers } : {}),
      subject,
      html,
      text,
    };

    return this.send(message, transportOptions);
  }

  get transportName(): string {
    return this.transport.name;
  }

  async verify(): Promise<Result<true, EmailError>> {
    if (this.transport.verify) {
      try {
        return await this.transport.verify();
      } catch (cause) {
        return err(emailSendFailed(`Transport verification failed for ${this.transport.name}`, cause));
      }
    }
    return ok(true);
  }

  async close(): Promise<void> {
    if (this.transport.close) {
      await this.transport.close();
    }
  }
}
