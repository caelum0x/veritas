// Public surface re-export for @veritas/realtime.

export type { ChannelId, SubscriptionId, TopicId, RealtimeEvent, RealtimeMessage, PresenceInfo, BackpressureOptions, HeartbeatOptions, SerializedFrame, HubPublishOptions, EventHandler as RealtimeEventHandler } from "./types.js";
export { createChannel, newChannelId } from "./channel.js";
export type { Channel } from "./channel.js";
export { createSubscription, newSubscriptionId } from "./subscription.js";
export type { Subscription, SubscriptionOptions, EventHandler } from "./subscription.js";
export { ChannelNotFoundError, SubscriptionNotFoundError, BufferFullError, SerializationError } from "./errors.js";
