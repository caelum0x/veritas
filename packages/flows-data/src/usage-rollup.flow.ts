// Usage rollup flow: query analytics events → build daily rollups → store to warehouse.
import { ok, err, isOk, type Result } from "@veritas/core";
import type { IsoTimestamp } from "@veritas/core";
import { buildDailyRollups } from "@veritas/analytics";
import type { DailyRollup } from "@veritas/analytics";
import { UsageRollupFlowError } from "./errors.js";
import { makeUsageRollupCompletedEvent } from "./events.js";
import type { UsageRollupFlowDeps } from "./deps.js";

export interface UsageRollupInput {
  readonly from: IsoTimestamp;
  readonly to: IsoTimestamp;
  readonly organizationId?: string;
  readonly warehouseTable?: { readonly schema: string; readonly name: string };
}

export interface UsageRollupOutput {
  readonly rollupCount: number;
  readonly totalEvents: number;
  readonly date: string;
  readonly organizationId: string | undefined;
}

export class UsageRollupFlow {
  constructor(private readonly deps: UsageRollupFlowDeps) {}

  async run(input: UsageRollupInput): Promise<Result<UsageRollupOutput, UsageRollupFlowError>> {
    const { analyticsStore, warehouse, logger, eventBus } = this.deps;
    const table = input.warehouseTable ?? { schema: "analytics", name: "usage_rollups" };

    logger.info("usage-rollup-flow: starting", {
      from: input.from,
      to: input.to,
      organizationId: input.organizationId,
    });

    const queryResult = analyticsStore.query({
      from: input.from,
      to: input.to,
      organizationId: input.organizationId,
      limit: 100_000,
    });

    if (!isOk(queryResult)) {
      return err(
        new UsageRollupFlowError({
          message: `Analytics store query failed: ${queryResult.error.message}`,
          cause: queryResult.error,
        }),
      );
    }

    const { events } = queryResult.value;
    const rollups: DailyRollup[] = buildDailyRollups(events, input.organizationId);

    if (rollups.length === 0) {
      logger.info("usage-rollup-flow: no events to roll up");
      return ok({ rollupCount: 0, totalEvents: 0, date: input.from, organizationId: input.organizationId });
    }

    const rows = rollups.map((r) => ({
      date: r.date,
      organization_id: r.organizationId ?? null,
      total_events: r.totalEvents,
      total_successes: r.totalSuccesses,
      total_failures: r.totalFailures,
      avg_duration_ms: r.avgDurationMs,
      event_counts: JSON.stringify(r.eventCounts),
      success_counts: JSON.stringify(r.successCounts),
      computed_at: r.computedAt,
    }));

    const loadResult = await warehouse.load(table, rows);
    if (loadResult.failed > 0) {
      return err(
        new UsageRollupFlowError({
          message: `Warehouse load had ${loadResult.failed} failures: ${loadResult.errors.join("; ")}`,
        }),
      );
    }

    const totalEvents = rollups.reduce((sum, r) => sum + r.totalEvents, 0);
    const lastDate = rollups[rollups.length - 1]?.date ?? input.from;

    logger.info("usage-rollup-flow: completed", { rollupCount: rollups.length, totalEvents });

    await eventBus.publish(
      makeUsageRollupCompletedEvent({
        date: lastDate,
        organizationId: input.organizationId,
        total: totalEvents,
      }),
    );

    return ok({
      rollupCount: rollups.length,
      totalEvents,
      date: lastDate,
      organizationId: input.organizationId,
    });
  }
}
