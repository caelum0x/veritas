// Webhook channel — POSTs notification payloads to a registered HTTP endpoint

import { ok, err, epochToIso, withRetry, DEFAULT_RETRY, sha256Hex } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { NotificationChannel, DeliveryMeta } from "../channel.js";
import type { Notification } from "../types.js";

export interface WebhookChannelOptions {
  /** Shared secret used to sign payloads (X-Veritas-Signature header). */
  secret: string;
  /** Timeout in milliseconds for each HTTP attempt. Default: 10000 */
  timeoutMs?: number;
}

/** Notification channel that delivers via signed HTTP POST to a webhook URL. */
export class WebhookChannel implements NotificationChannel {
  readonly id = "webhook";
  private readonly timeoutMs: number;

  constructor(private readonly opts: WebhookChannelOptions) {
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  supports(notification: Notification): boolean {
    return notification.channel === "IN_APP" || notification.channel === "WEBHOOK";
  }

  async send(notification: Notification, recipientAddress: string): Promise<Result<DeliveryMeta, Error>> {
    const payload = JSON.stringify({
      id: notification.id,
      channel: notification.channel,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata,
      sentAt: epochToIso(Date.now()),
    });

    const signature = await sha256Hex(this.opts.secret + payload);

    const attempt = async (): Promise<DeliveryMeta> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(recipientAddress, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Veritas-Signature": signature,
            "X-Veritas-Notification-Id": notification.id,
          },
          body: payload,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Webhook responded with HTTP ${response.status}`);
        }
        const externalId = response.headers.get("X-Delivery-Id") ?? undefined;
        return {
          channelId: this.id,
          deliveredAt: epochToIso(Date.now()),
          ...(externalId !== undefined ? { externalId } : {}),
        };
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      const meta = await withRetry(attempt, DEFAULT_RETRY);
      return ok(meta);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
