// Subscribes to CDC topics and dispatches events to registered handlers.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { MessageBus, MessageHandler } from "@veritas/messaging";
import type { Message } from "@veritas/messaging";
import type { CdcEvent } from "./change-event.js";
import { CdcEventSchema } from "./change-event.js";
import type { CdcError } from "./errors.js";
import { cdcError } from "./errors.js";

export type CdcEventHandler = (event: CdcEvent) => Promise<void>;

export interface SubscriberOptions {
  /** Topic prefix used when publishing; defaults to "cdc" */
  readonly topicPrefix?: string;
  /** Tables to subscribe to; if empty subscribes to all via wildcard */
  readonly tables?: readonly string[];
}

export interface ChangeSubscriber {
  /** Subscribe a handler for a specific table and operation pattern */
  subscribe(
    table: string,
    operation: string,
    handler: CdcEventHandler,
  ): Result<() => void, CdcError>;
  /** Subscribe to all changes for a given table */
  subscribeTable(table: string, handler: CdcEventHandler): Result<() => void, CdcError>;
}

/** Wraps a CdcEventHandler as a MessageHandler compatible with MessageBus.subscribe */
function toMessageHandler(handler: CdcEventHandler): MessageHandler<unknown> {
  return {
    async handle(message: Message<unknown>): Promise<Result<void, Error>> {
      const parsed = CdcEventSchema.safeParse(message.payload);
      if (!parsed.success) {
        return ok(undefined);
      }
      await handler(parsed.data as CdcEvent);
      return ok(undefined);
    },
  };
}

/** Creates a subscriber that routes incoming messages to typed CdcEvent handlers */
export function createChangeSubscriber(
  bus: MessageBus,
  options: SubscriberOptions = {},
): ChangeSubscriber {
  const prefix = options.topicPrefix ?? "cdc";

  return {
    subscribe(
      table: string,
      operation: string,
      handler: CdcEventHandler,
    ): Result<() => void, CdcError> {
      const topic = `${prefix}.${table}.${operation}`;
      try {
        const unsub = bus.subscribe(topic, toMessageHandler(handler));
        return ok(unsub);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return err(cdcError("SUBSCRIBE_FAILED", `Subscribe failed for ${topic}: ${msg}`));
      }
    },

    subscribeTable(table: string, handler: CdcEventHandler): Result<() => void, CdcError> {
      const operations = ["insert", "update", "delete", "truncate"];
      const unsubs: Array<() => void> = [];
      for (const op of operations) {
        const topic = `${prefix}.${table}.${op}`;
        try {
          unsubs.push(bus.subscribe(topic, toMessageHandler(handler)));
        } catch (e: unknown) {
          unsubs.forEach((u) => u());
          const msg = e instanceof Error ? e.message : String(e);
          return err(cdcError("SUBSCRIBE_FAILED", `Subscribe failed for ${topic}: ${msg}`));
        }
      }
      return ok(() => unsubs.forEach((u) => u()));
    },
  };
}
