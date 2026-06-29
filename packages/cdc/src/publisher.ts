// Publishes captured CDC events onto a message bus topic.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { MessageBus } from "@veritas/messaging";
import type { CdcEvent } from "./change-event.js";
import { serializeCdcEvent } from "./change-event.js";
import type { CdcError } from "./errors.js";
import { cdcError } from "./errors.js";

export interface PublisherOptions {
  /** Topic prefix; defaults to "cdc" */
  readonly topicPrefix?: string;
}

export interface ChangePublisher {
  publish(event: CdcEvent): Promise<Result<void, CdcError>>;
}

/** Creates a publisher that routes events to <prefix>.<table>.<operation> topics */
export function createChangePublisher(
  bus: MessageBus,
  options: PublisherOptions = {},
): ChangePublisher {
  const prefix = options.topicPrefix ?? "cdc";

  return {
    async publish(event: CdcEvent): Promise<Result<void, CdcError>> {
      const topic = `${prefix}.${event.table}.${event.operation}`;
      const payload = serializeCdcEvent(event);
      const result = await bus.publish({ topic, payload });
      if (result.ok) {
        return ok(undefined);
      }
      return err(
        cdcError("PUBLISH_FAILED", `Failed to publish change event: ${result.error.message}`, {
          eventId: event.id,
          table: event.table,
        })
      );
    },
  };
}
