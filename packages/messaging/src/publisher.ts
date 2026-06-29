// Publisher: typed helper that scopes publish calls to a fixed topic.
import type { Result } from "@veritas/core";
import type { Message, MessageInit } from "./message.js";
import type { MessageBus, PublishOptions } from "./message-bus.js";
import type { MessagingError } from "./errors.js";

export interface Publisher<TPayload> {
  publish(
    payload: TPayload,
    options?: PublishOptions & { headers?: Record<string, string> },
  ): Promise<Result<Message<TPayload>, MessagingError>>;

  readonly topic: string;
}

export function createPublisher<TPayload>(
  bus: MessageBus,
  topic: string,
): Publisher<TPayload> {
  return {
    topic,
    publish(
      payload: TPayload,
      options?: PublishOptions & { headers?: Record<string, string> },
    ): Promise<Result<Message<TPayload>, MessagingError>> {
      const init: MessageInit<TPayload> = {
        topic,
        payload,
        headers: options?.headers,
      };
      return bus.publish(init, options);
    },
  };
}

export interface TypedPublisherMap {
  [topic: string]: Publisher<unknown>;
}

export function createPublisherMap<T extends Record<string, unknown>>(
  bus: MessageBus,
  topics: { [K in keyof T]: string },
): { [K in keyof T]: Publisher<T[K]> } {
  const result = {} as { [K in keyof T]: Publisher<T[K]> };
  for (const key of Object.keys(topics) as Array<keyof T>) {
    result[key] = createPublisher<T[typeof key]>(bus, topics[key]) as Publisher<T[keyof T]>;
  }
  return result;
}
