// Shared types for the @veritas/realtime module.

export type ChannelId = string & { readonly _brand: "ChannelId" };
export type SubscriptionId = string & { readonly _brand: "SubscriptionId" };
export type TopicId = string & { readonly _brand: "TopicId" };

export interface RealtimeEvent {
  readonly id: string;
  readonly topic: string;
  readonly type: string;
  readonly payload: unknown;
  readonly timestamp: string;
}

export interface RealtimeMessage {
  readonly event: RealtimeEvent;
  readonly channel: string;
}

export interface PresenceInfo {
  readonly subscriberId: string;
  readonly channelId: string;
  readonly joinedAt: string;
  readonly meta: Record<string, unknown>;
}

export interface BackpressureOptions {
  readonly maxBufferSize: number;
  readonly dropPolicy: "drop-oldest" | "drop-newest" | "error";
}

export interface HeartbeatOptions {
  readonly intervalMs: number;
  readonly timeoutMs: number;
}

export interface SerializedFrame {
  readonly type: "event" | "heartbeat" | "subscribe" | "unsubscribe" | "error";
  readonly data: string;
}

export interface HubPublishOptions {
  readonly retain?: boolean;
}

export type EventHandler = (event: RealtimeEvent) => void;
