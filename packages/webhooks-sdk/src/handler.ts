// Typed handler registry mapping webhook event types to async handler functions.

import { Result, ok, err } from "@veritas/core";
import type { WebhookEvent } from "./types.js";
import type { WebhookEventType } from "./event.js";
import { WebhookHandlerNotFoundError, WebhookParseError } from "./errors.js";

export type WebhookHandler<P = Record<string, unknown>> = (
  event: Omit<WebhookEvent, "payload"> & { payload: P },
) => Promise<void>;

export type AnyWebhookHandler = WebhookHandler<Record<string, unknown>>;

export interface HandlerRegistration {
  eventType: WebhookEventType | string;
  handler: AnyWebhookHandler;
}

/** Registry mapping event type strings to typed handlers. */
export class WebhookHandlerRegistry {
  private readonly handlers = new Map<string, AnyWebhookHandler>();
  private fallback: AnyWebhookHandler | null = null;

  /** Register a typed handler for a specific event type. */
  on<P extends Record<string, unknown>>(
    eventType: WebhookEventType | string,
    handler: WebhookHandler<P>,
  ): this {
    this.handlers.set(eventType, handler as AnyWebhookHandler);
    return this;
  }

  /** Register a fallback handler invoked when no typed handler matches. */
  onUnknown(handler: AnyWebhookHandler): this {
    this.fallback = handler;
    return this;
  }

  /** Dispatch a parsed WebhookEvent to the appropriate handler. */
  async dispatch(
    event: WebhookEvent,
  ): Promise<Result<void, WebhookHandlerNotFoundError>> {
    const handler = this.handlers.get(event.type);

    if (handler !== undefined) {
      await handler(event as Omit<WebhookEvent, "payload"> & { payload: Record<string, unknown> });
      return ok(undefined);
    }

    if (this.fallback !== null) {
      await this.fallback(event as Omit<WebhookEvent, "payload"> & { payload: Record<string, unknown> });
      return ok(undefined);
    }

    return err(new WebhookHandlerNotFoundError(event.type));
  }

  /** Returns the list of registered event types. */
  registeredTypes(): readonly string[] {
    return [...this.handlers.keys()];
  }

  /** Returns true if a handler is registered for the given event type. */
  has(eventType: string): boolean {
    return this.handlers.has(eventType);
  }
}

/** Create a new handler registry. */
export function createHandlerRegistry(): WebhookHandlerRegistry {
  return new WebhookHandlerRegistry();
}
