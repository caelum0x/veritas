// NotificationChannel interface — abstraction for delivering notifications via different transports

import type { Result } from "@veritas/core";
import type { Notification } from "./types.js";

/** Delivery result metadata returned by a channel after sending. */
export interface DeliveryMeta {
  channelId: string;
  deliveredAt: string;
  externalId?: string;
}

/** Abstract contract every notification channel must implement. */
export interface NotificationChannel {
  /** Unique identifier for this channel (e.g. "log", "webhook", "email"). */
  readonly id: string;

  /**
   * Send a notification to the specified recipient address.
   * Returns Ok(DeliveryMeta) on success, Err(AppError) on failure.
   */
  send(notification: Notification, recipientAddress: string): Promise<Result<DeliveryMeta, Error>>;

  /** Returns true if this channel can handle the given notification kind. */
  supports(notification: Notification): boolean;
}
