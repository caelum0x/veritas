// OutboundPayload: the normalised message envelope sent to every connector.
import { z } from "zod";

export const OutboundPayloadSchema = z.object({
  /** Unique delivery ID (nanoid) for idempotency tracking. */
  deliveryId: z.string().min(1),
  /** ISO-8601 timestamp of when the event was raised. */
  occurredAt: z.string().datetime(),
  /** Original domain event type, e.g. "claim.verified". */
  eventType: z.string().min(1),
  /** Human-readable summary line. */
  summary: z.string().min(1),
  /** Optional longer Markdown body. */
  body: z.string().optional(),
  /** Structured fields surfaced as key-value metadata. */
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  /** Source URL users can follow for full context. */
  sourceUrl: z.string().url().optional(),
  /** Severity hint for connector-side colouring / routing. */
  severity: z.enum(["info", "warning", "error"]).default("info"),
});

export type OutboundPayload = z.infer<typeof OutboundPayloadSchema>;
