// Hub: pub/sub coordinator managing channels and routing published events.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { RealtimeEvent } from "./types.js";
import type { Channel } from "./channel.js";
import type { Subscription } from "./subscription.js";
import { ChannelNotFoundError } from "./errors.js";

export interface Hub {
  createChannel(name: string): Channel;
  getChannel(name: string): Channel | undefined;
  deleteChannel(name: string): void;
  subscribe(channelName: string, sub: Subscription): Result<void, ChannelNotFoundError>;
  unsubscribe(channelName: string, subscriptionId: string): Result<void, ChannelNotFoundError>;
  publish(channelName: string, event: RealtimeEvent): Result<void, ChannelNotFoundError>;
  channelNames(): ReadonlyArray<string>;
  close(): void;
}
