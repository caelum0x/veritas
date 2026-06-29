// Route incoming CAP WebSocket events to the appropriate lifecycle handlers.

import { noopLogger, isObject, hasKey, isString } from "@veritas/core";
import type { Logger } from "@veritas/core";
import type { AgentClient } from "./client.js";

/** Known CAP event types emitted by the agent relay. */
export type CapEventType =
  | "NEGOTIATION_CREATED"
  | "ORDER_PAID"
  | "ORDER_COMPLETED"
  | "ORDER_REJECTED"
  | "ORDER_EXPIRED"
  | "PING"
  | "ERROR";

/** A typed CAP event as received from the relay. */
export interface CapEvent {
  readonly type: CapEventType;
  readonly payload: unknown;
}

/** A handler for a specific CAP event type. */
export type CapEventHandler = (event: CapEvent) => Promise<void>;

/** Registry mapping event types to their handlers. */
export type HandlerRegistry = Partial<Record<CapEventType, CapEventHandler>>;

/** Parse and validate a raw relay message into a CapEvent. Returns null on failure. */
function parseCapEvent(raw: unknown): CapEvent | null {
  if (!isObject(raw)) return null;
  if (!hasKey(raw, "type") || !isString(raw["type"])) return null;
  return { type: raw["type"] as CapEventType, payload: (raw as Record<string, unknown>)["payload"] };
}

/** Attach a message listener to the client that routes events to registered handlers. */
export function attachEventRouter(
  client: AgentClient,
  registry: HandlerRegistry,
  logger: Logger = noopLogger,
): () => void {
  const unsubscribe = client.onMessage(async (raw) => {
    const event = parseCapEvent(raw);
    if (event === null) {
      logger.warn("cap:router unknown message", { raw: JSON.stringify(raw) });
      return;
    }

    if (event.type === "PING") {
      // Respond with PONG — no handler needed.
      await client.send({ type: "PONG" });
      return;
    }

    const handler = registry[event.type];
    if (handler === undefined) {
      logger.warn("cap:router unhandled event", { type: event.type });
      return;
    }

    try {
      await handler(event);
    } catch (e: unknown) {
      logger.error("cap:router handler error", {
        type: event.type,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return unsubscribe;
}

/** Build a HandlerRegistry from a map of async handler functions. */
export function buildRegistry(handlers: HandlerRegistry): HandlerRegistry {
  return { ...handlers };
}
