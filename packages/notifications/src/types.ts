// Core notification types used throughout the notifications package

import { z } from "zod";
import { NotificationSchema, NotificationChannelSchema } from "@veritas/contracts";

export type NotificationChannelKind = z.infer<typeof NotificationChannelSchema>;
export type Notification = z.infer<typeof NotificationSchema>;

/** Rendered message ready to send via a channel. */
export interface RenderedMessage {
  subject: string;
  body: string;
  html?: string;
}

/** Per-recipient channel preference entry. */
export interface ChannelPreference {
  recipientId: string;
  channelId: string;
  enabled: boolean;
  address: string;
}

/** Result of a multi-channel send attempt. */
export interface SendResult {
  notificationId: string;
  succeeded: string[];
  failed: Array<{ channelId: string; reason: string }>;
}
