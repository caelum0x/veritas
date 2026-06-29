// Email channel — sends notifications via a pluggable EmailTransport interface

import { ok, err, epochToIso } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { NotificationChannel, DeliveryMeta } from "../channel.js";
import type { Notification, RenderedMessage } from "../types.js";

/** Minimal interface for an email transport (SMTP, SES, SendGrid, etc.). */
export interface EmailTransport {
  send(options: EmailSendOptions): Promise<{ messageId: string }>;
}

export interface EmailSendOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailChannelOptions {
  transport: EmailTransport;
  fromAddress: string;
}

/** Notification channel that delivers via email using an injected EmailTransport. */
export class EmailChannel implements NotificationChannel {
  readonly id = "email";

  constructor(private readonly opts: EmailChannelOptions) {}

  supports(notification: Notification): boolean {
    return notification.channel === "EMAIL";
  }

  async send(notification: Notification, recipientAddress: string): Promise<Result<DeliveryMeta, Error>> {
    const rendered: RenderedMessage = {
      subject: notification.title,
      body: notification.body,
    };

    try {
      const result = await this.opts.transport.send({
        from: this.opts.fromAddress,
        to: recipientAddress,
        subject: rendered.subject,
        text: rendered.body,
        ...(rendered.html !== undefined ? { html: rendered.html } : {}),
      });

      return ok<DeliveryMeta>({
        channelId: this.id,
        deliveredAt: epochToIso(Date.now()),
        externalId: result.messageId,
      });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
