// Event (de)serialization: encode StoredEvent to JSON and decode back.
import { z } from "zod";
import { isoTimestampSchema } from "@veritas/core";
import type { StoredEvent, DomainEventMetadata } from "./domain-event.js";
import { EventDeserializationError } from "./errors.js";

const metadataSchema = z.object({
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  userId: z.string().optional(),
}) satisfies z.ZodType<DomainEventMetadata>;

const storedEventSchema = z.object({
  id: z.string(),
  aggregateId: z.string(),
  aggregateType: z.string(),
  eventType: z.string(),
  version: z.number().int().positive(),
  occurredAt: isoTimestampSchema,
  payload: z.unknown(),
  metadata: metadataSchema,
});

export type SerializedEvent = z.infer<typeof storedEventSchema>;

export interface EventSerializer {
  serialize(event: StoredEvent): string;
  deserialize(raw: string): StoredEvent;
  serializeToObject(event: StoredEvent): SerializedEvent;
  deserializeFromObject(obj: unknown): StoredEvent;
}

export function createEventSerializer(): EventSerializer {
  function serializeToObject(event: StoredEvent): SerializedEvent {
    return {
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      version: event.version,
      occurredAt: event.occurredAt,
      payload: event.payload,
      metadata: event.metadata,
    };
  }

  function deserializeFromObject(obj: unknown): StoredEvent {
    const result = storedEventSchema.safeParse(obj);
    if (!result.success) {
      const eventType =
        isObject(obj) && isString((obj as Record<string, unknown>).eventType)
          ? String((obj as Record<string, unknown>).eventType)
          : "unknown";
      throw new EventDeserializationError(
        eventType,
        new Error(result.error.message)
      );
    }
    return result.data as StoredEvent;
  }

  function serialize(event: StoredEvent): string {
    return JSON.stringify(serializeToObject(event));
  }

  function deserialize(raw: string): StoredEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new EventDeserializationError("unknown", cause);
    }
    return deserializeFromObject(parsed);
  }

  return { serialize, deserialize, serializeToObject, deserializeFromObject };
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isString(val: unknown): val is string {
  return typeof val === "string";
}

export const defaultSerializer: EventSerializer = createEventSerializer();
