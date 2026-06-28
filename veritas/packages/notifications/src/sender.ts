// Multi-channel notification sender that fans out to configured channels based on recipient preferences.

import { ok, err, isOk, epochToIso, type Logger, noopLogger } from "@veritas/core";
import type { NotificationChannel, DeliveryMeta } from "./channel.js";
import type { Notification, SendResult } from "./types.js";
import { PreferenceStore } from "./preferences.js";

export interface SenderOptions {
  channels: NotificationChannel[];
  preferences: PreferenceStore;
  logger?: Logger;
}

/**
 * Sends a notification to all enabled channels for the recipient.
 * Channels that do not support the notification are skipped silently.
 * Per-channel failures are collected rather than thrown.
 */
export class NotificationSender {
  private readonly channels: ReadonlyArray<NotificationChannel>;
  private readonly preferences: PreferenceStore;
  private readonly logger: Logger;

  constructor(options: SenderOptions) {
    this.channels = [...options.channels];
    this.preferences = options.preferences;
    this.logger = options.logger ?? noopLogger;
  }

  async send(notification: Notification): Promise<SendResult> {
    const recipientId = notification.userId;
    const succeeded: string[] = [];
    const failed: Array<{ channelId: string; reason: string }> = [];

    const enabledChannels = this.channels.filter((channel) => {
      if (!channel.supports(notification)) return false;
      const address = this.preferences.addressFor(recipientId, channel.id);
      return address !== undefined;
    });

    if (enabledChannels.length === 0) {
      this.logger.warn("No enabled channels found for recipient", {
        notificationId: notification.id,
        recipientId,
      });
    }

    await Promise.all(
      enabledChannels.map(async (channel) => {
        const address = this.preferences.addressFor(recipientId, channel.id)!;
        const result = await channel.send(notification, address);
        if (isOk(result)) {
          succeeded.push(channel.id);
          this.logger.info("Notification dispatched", {
            notificationId: notification.id,
            channelId: channel.id,
            externalId: (result.value as DeliveryMeta).externalId,
          });
        } else {
          const reason =
            result.error instanceof Error
              ? result.error.message
              : String(result.error);
          failed.push({ channelId: channel.id, reason });
          this.logger.error("Notification dispatch failed", {
            notificationId: notification.id,
            channelId: channel.id,
            reason,
          });
        }
      })
    );

    return { notificationId: notification.id, succeeded, failed };
  }

  /**
   * Send a notification to an explicit list of channels, bypassing preference
   * resolution. Useful for system-level or forced notifications.
   */
  async sendDirect(
    notification: Notification,
    channelAddresses: Record<string, string>
  ): Promise<SendResult> {
    const succeeded: string[] = [];
    const failed: Array<{ channelId: string; reason: string }> = [];

    await Promise.all(
      this.channels.map(async (channel) => {
        const address = channelAddresses[channel.id];
        if (!address) return;
        if (!channel.supports(notification)) return;

        const result = await channel.send(notification, address);
        if (isOk(result)) {
          succeeded.push(channel.id);
        } else {
          const reason =
            result.error instanceof Error
              ? result.error.message
              : String(result.error);
          failed.push({ channelId: channel.id, reason });
        }
      })
    );

    return { notificationId: notification.id, succeeded, failed };
  }
}
