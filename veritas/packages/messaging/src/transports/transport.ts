// Transport interface: abstraction over network/process message delivery channels.
import type { Result } from "@veritas/core";
import type { Message } from "../message.js";
import type { TransportError } from "../errors.js";

export type TransportHandler<TPayload = unknown> = (
  message: Message<TPayload>,
) => Promise<void>;

export interface TransportSubscription {
  readonly topic: string;
  unsubscribe(): Promise<void>;
}

export interface SendOptions {
  readonly timeout?: number;
}

export interface SubscribeOptions {
  readonly groupId?: string;
  readonly fromBeginning?: boolean;
}

/** Low-level transport contract — implemented by memory, kafka, redis, etc. */
export interface Transport {
  /** Send a single message to the underlying channel. */
  send<TPayload>(
    message: Message<TPayload>,
    options?: SendOptions,
  ): Promise<Result<void, TransportError>>;

  /** Subscribe to a topic pattern and receive incoming messages. */
  subscribe<TPayload>(
    topic: string,
    handler: TransportHandler<TPayload>,
    options?: SubscribeOptions,
  ): Promise<Result<TransportSubscription, TransportError>>;

  /** Connect/start the transport. */
  connect(): Promise<Result<void, TransportError>>;

  /** Disconnect/stop the transport gracefully. */
  disconnect(): Promise<Result<void, TransportError>>;

  /** Whether the transport is currently connected. */
  readonly isConnected: boolean;
}
