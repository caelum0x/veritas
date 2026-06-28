// Message envelope: typed wrapper for all bus messages with routing metadata.
import { type IsoTimestamp, type Id, newId } from "@veritas/core";

export type MessageId = Id<"Message">;

export interface MessageHeaders {
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly [key: string]: string | undefined;
}

export interface Message<TPayload = unknown> {
  readonly id: MessageId;
  readonly topic: string;
  readonly payload: TPayload;
  readonly headers: MessageHeaders;
  readonly timestamp: IsoTimestamp;
  readonly version: number;
}

export interface MessageInit<TPayload = unknown> {
  readonly topic: string;
  readonly payload: TPayload;
  readonly headers?: MessageHeaders;
  readonly timestamp?: IsoTimestamp;
  readonly version?: number;
}

export function makeMessage<TPayload>(init: MessageInit<TPayload>): Message<TPayload> {
  return {
    id: newId("Message"),
    topic: init.topic,
    payload: init.payload,
    headers: init.headers ?? {},
    timestamp: init.timestamp ?? new Date().toISOString() as IsoTimestamp,
    version: init.version ?? 1,
  };
}

export function withHeader<TPayload>(
  message: Message<TPayload>,
  key: string,
  value: string,
): Message<TPayload> {
  return {
    ...message,
    headers: { ...message.headers, [key]: value },
  };
}
