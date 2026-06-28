// Usage service: records usage events and aggregates period totals via package flows.

import { isErr, type Result, ok, err, type Id } from "@veritas/core";
import { meterUsageFlow } from "@veritas/flows-commerce";
import { aggregateUsage, filterByOrg, filterByPeriod } from "@veritas/billing";
import type { UsageEvent } from "@veritas/usage-billing";
import type { PeriodUsage, AggregationGranularity } from "@veritas/billing";
import type { IsoTimestamp } from "@veritas/core";
import type { Deps } from "../../container.js";
import type { RecordUsageBody, ListUsageQuery } from "./usage.schema.js";

export interface RecordUsageResult {
  readonly event: UsageEvent;
}

export interface ListUsageResult {
  readonly periods: readonly PeriodUsage[];
}

export class UsageService {
  constructor(private readonly deps: Deps) {}

  async recordUsage(body: RecordUsageBody): Promise<Result<RecordUsageResult>> {
    const result = await meterUsageFlow(
      {
        organizationId: body.organizationId as Id<string>,
        metric: body.metric,
        quantity: body.quantity,
        userId: body.userId as Id<string> | undefined,
        metadata: body.metadata,
      },
      {
        usageMeter: this.deps.usageMeter,
        logger: this.deps.logger,
      },
    );

    if (isErr(result)) {
      this.deps.logger.warn("usage_service.record_failed", { error: result.error.message });
      return err(result.error);
    }

    const buffered = this.deps.usageMeter.peek();
    const event = buffered.find((e) => e.id === result.value.usageEventId);

    if (!event) {
      // Event was flushed; reconstruct from flow output
      const synthetic: UsageEvent = {
        id: result.value.usageEventId,
        organizationId: result.value.organizationId,
        userId: body.userId ?? null,
        metric: result.value.metric,
        quantity: result.value.quantity,
        occurredAt: result.value.occurredAt,
        metadata: body.metadata ?? {},
      };
      return ok({ event: synthetic });
    }

    return ok({ event });
  }

  listUsage(query: ListUsageQuery): Result<ListUsageResult> {
    const allEvents = this.deps.usageMeter.peek();

    // Coerce UsageEvent[] to the shape aggregateUsage expects (MeteringEvent[])
    const meteringCompatible = allEvents.map((e) => ({
      id: e.id as Id<"metering">,
      organizationId: e.organizationId as Id<string>,
      userId: e.userId as Id<string> | null,
      metric: e.metric,
      quantity: e.quantity,
      occurredAt: e.occurredAt as IsoTimestamp,
      metadata: e.metadata as Record<string, string>,
    }));

    const granularity: AggregationGranularity =
      query.granularity === "day" ? "day" : "month";

    let periods = aggregateUsage(meteringCompatible, granularity);
    periods = filterByOrg(periods, query.organizationId as Id<string>);

    if (query.from || query.to) {
      const from = (query.from ?? "1970-01-01T00:00:00.000Z") as IsoTimestamp;
      const to = (query.to ?? new Date().toISOString()) as IsoTimestamp;
      periods = filterByPeriod(periods, from, to);
    }

    return ok({ periods });
  }
}
