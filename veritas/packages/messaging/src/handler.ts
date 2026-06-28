// MessageHandler interface — typed handler for a single message kind
import type { Result } from "@veritas/core";
import type { Message } from "./message.js";

/** A handler processes a single message and returns a Result. */
export interface MessageHandler<TPayload = unknown, TErr = Error> {
  handle(message: Message<TPayload>): Promise<Result<void, TErr>>;
}

/** Synchronous variant for simple handlers that don't need async. */
export interface SyncMessageHandler<TPayload = unknown, TErr = Error> {
  handleSync(message: Message<TPayload>): Result<void, TErr>;
}

/** Handler factory — creates a handler from a plain function. */
export function handlerFrom<TPayload, TErr = Error>(
  fn: (message: Message<TPayload>) => Promise<Result<void, TErr>>
): MessageHandler<TPayload, TErr> {
  return { handle: fn };
}
