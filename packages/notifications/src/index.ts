// Public re-exports for the @veritas/notifications package.

export type { NotificationChannel, DeliveryMeta } from "./channel.js";

export type {
  NotificationChannelKind,
  Notification,
  RenderedMessage,
  ChannelPreference,
  SendResult,
} from "./types.js";

export { renderTemplate, registerTemplate } from "./templates.js";

export { PreferenceStore } from "./preferences.js";

export { NotificationSender } from "./sender.js";
export type { SenderOptions } from "./sender.js";

export { LogChannel } from "./channels/log-channel.js";

export { WebhookChannel } from "./channels/webhook-channel.js";
export type { WebhookChannelOptions } from "./channels/webhook-channel.js";

export { EmailChannel } from "./channels/email-channel.js";
export type {
  EmailChannel as EmailChannelClass,
  EmailTransport,
  EmailSendOptions,
  EmailChannelOptions,
} from "./channels/email-channel.js";
