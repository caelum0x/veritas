// Bus interface: contract for publishing and subscribing to typed messages.
import type { Result } from "@veritas/core";
import type { Message, MessageInit } from "./message.js";
import type { MessageHandler } from "./handler.js";
import type { MessagingError } from "./errors.js";

export type Unsubscribe = () => void;

export interface SubscribeOptions {
  readonly groupId?: string;
  readonly fromBeginning?: boolean;
}

export interface PublishOptions {
  readonly delay?: number;
}

export interface MessageBus {
  publish<TPayload>(
    init: MessageInit<TPayload>,
    options?: PublishOptions,
  ): Promise<Result<Message<TPayload>, MessagingError>>;

  subscribe<TPayload>(
    topic: string,
    handler: MessageHandler<TPayload>,
    options?: SubscribeOptions,
  ): Unsubscribe;

  subscribeMany<TPayload>(
    topics: readonly string[],
    handler: MessageHandler<TPayload>,
    options?: SubscribeOptions,
  ): Unsubscribe;

  start(): Promise<void>;
  stop(): Promise<void>;
}
