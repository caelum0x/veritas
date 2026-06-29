// Log channel — writes notifications to a Logger instead of an external transport

import { ok, epochToIso, type Logger, type Result } from "@veritas/core";
import type { NotificationChannel, DeliveryMeta } from "../channel.js";
import type { Notification } from "../types.js";

/** Notification channel that emits to a structured logger (useful for dev/test). */
export class LogChannel implements NotificationChannel {
  readonly id = "log";

  constructor(private readonly logger: Logger) {}

  supports(_notification: Notification): boolean {
    return true; // log channel accepts everything
  }

  async send(notification: Notification, recipientAddress: string): Promise<Result<DeliveryMeta, Error>> {
    const deliveredAt = epochToIso(Date.now());
    this.logger.info("notification:log-channel:send", {
      notificationId: notification.id,
      kind: notification.channel,
      recipientAddress,
      title: notification.title,
      body: notification.body,
      deliveredAt,
    });
    return ok<DeliveryMeta>({
      channelId: this.id,
      deliveredAt,
    });
  }
}
