// Domain errors for @veritas/realtime.
import { AppError } from "@veritas/core";

export class ChannelNotFoundError extends AppError {
  constructor(channelId: string) {
    super("NOT_FOUND", 404, `Channel not found: ${channelId}`);
    this.name = "ChannelNotFoundError";
  }
}

export class SubscriptionNotFoundError extends AppError {
  constructor(subscriptionId: string) {
    super("NOT_FOUND", 404, `Subscription not found: ${subscriptionId}`);
    this.name = "SubscriptionNotFoundError";
  }
}

export class BufferFullError extends AppError {
  constructor(channelId: string) {
    super("UNAVAILABLE", 503, `Buffer full for channel: ${channelId}`);
    this.name = "BufferFullError";
  }
}

export class SerializationError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, `Serialization failed: ${detail}`);
    this.name = "SerializationError";
  }
}

export class HeartbeatTimeoutError extends AppError {
  constructor(subscriberId: string) {
    super("UNAVAILABLE", 503, `Heartbeat timeout for subscriber: ${subscriberId}`);
    this.name = "HeartbeatTimeoutError";
  }
}

export class TopicNotFoundError extends AppError {
  constructor(topicId: string) {
    super("NOT_FOUND", 404, `Topic not found: ${topicId}`);
    this.name = "TopicNotFoundError";
  }
}
