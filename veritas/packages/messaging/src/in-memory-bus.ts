// In-memory bus: synchronous in-process implementation of MessageBus for testing and local dev.
import { ok, err, type Result, type Logger, noopLogger } from "@veritas/core";
import type { Message, MessageInit } from "./message.js";
import type { MessageBus, SubscribeOptions, PublishOptions, Unsubscribe } from "./message-bus.js";
import type { MessageHandler } from "./handler.js";
import { makeMessage } from "./message.js";
import { MessagingError } from "./errors.js";
import { SubscriberRegistry } from "./subscriber.js";

export interface InMemoryBusOptions {
  readonly logger?: Logger;
  readonly onError?: (error: unknown, message: Message<unknown>) => void;
}

export class InMemoryBus implements MessageBus {
  private readonly registry: SubscriberRegistry;
  private readonly logger: Logger;
  private readonly onError: (error: unknown, message: Message<unknown>) => void;
  private running = false;

  constructor(options: InMemoryBusOptions = {}) {
    this.registry = new SubscriberRegistry();
    this.logger = options.logger ?? noopLogger;
    this.onError = options.onError ?? ((e, m) => {
      this.logger.error("InMemoryBus handler error", { error: e, topic: m.topic });
    });
  }

  async publish<TPayload>(
    init: MessageInit<TPayload>,
    _options?: PublishOptions,
  ): Promise<Result<Message<TPayload>, MessagingError>> {
    if (!this.running) {
      return err(new MessagingError("BUS_NOT_STARTED", "Bus is not started"));
    }

    const message = makeMessage(init);

    this.logger.debug("Publishing message", { topic: message.topic, id: message.id });

    const handlers = this.registry.getHandlers<TPayload>(message.topic);

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler.handle(message);
        } catch (error) {
          this.onError(error, message as Message<unknown>);
        }
      }),
    );

    return ok(message);
  }

  subscribe<TPayload>(
    topic: string,
    handler: MessageHandler<TPayload>,
    _options?: SubscribeOptions,
  ): Unsubscribe {
    return this.registry.register(topic, handler);
  }

  subscribeMany<TPayload>(
    topics: readonly string[],
    handler: MessageHandler<TPayload>,
    options?: SubscribeOptions,
  ): Unsubscribe {
    const unsubs = topics.map((topic) => this.subscribe(topic, handler, options));
    return () => unsubs.forEach((unsub) => unsub());
  }

  async start(): Promise<void> {
    this.running = true;
    this.logger.info("InMemoryBus started");
  }

  async stop(): Promise<void> {
    this.running = false;
    this.registry.clear();
    this.logger.info("InMemoryBus stopped");
  }
}
