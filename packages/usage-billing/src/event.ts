// Usage event: immutable record of a single metered usage occurrence.

import { z } from "zod";
import { Id, IsoTimestamp, newId, epochToIso } from "@veritas/core";
import { UsageMetricSchema } from "@veritas/contracts";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export const UsageEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  metric: UsageMetricSchema,
  quantity: z.number().nonnegative(),
  occurredAt: z.string(),
  metadata: z.record(z.string()),
});

export type UsageEvent = z.infer<typeof UsageEventSchema>;

export interface CreateUsageEventOptions {
  readonly userId?: Id<string>;
  readonly metadata?: Record<string, string>;
  readonly occurredAt?: IsoTimestamp;
}

/** Create an immutable usage event for a given org, metric, and quantity. */
export function createUsageEvent(
  organizationId: Id<string>,
  metric: UsageMetric,
  quantity: number,
  opts: CreateUsageEventOptions = {}
): UsageEvent {
  if (quantity < 0) {
    throw new RangeError(`Usage quantity must be non-negative, got ${quantity}`);
  }
  return Object.freeze({
    id: newId("usage-event") as unknown as string,
    organizationId: organizationId as unknown as string,
    userId: (opts.userId ?? null) as string | null,
    metric,
    quantity,
    occurredAt: opts.occurredAt ?? epochToIso(Date.now()),
    metadata: Object.freeze({ ...(opts.metadata ?? {}) }),
  });
}

/** Validate an unknown value as a UsageEvent, returning null on failure. */
export function parseUsageEvent(raw: unknown): UsageEvent | null {
  const result = UsageEventSchema.safeParse(raw);
  return result.success ? result.data : null;
}
