// Wire scheduler, register cron jobs, and bind service handlers from the DI container.
import { InMemoryScheduler, type Scheduler, createJobRegistry, type JobExecutionContext, realTickableClock } from "@veritas/scheduler";
import type { Logger } from "@veritas/core";
import { Container } from "@veritas/container";
import { LOGGER, ORDER_SVC, USAGE_METERING_SVC, SETTLEMENT_SVC } from "@veritas/container/tokens";
import type { OrderService, UsageMeteringService, SettlementService } from "@veritas/services";
import { SCHEDULE_TABLE } from "./schedule-table.js";
import { makeExpireOrdersHandler } from "./jobs/expire-orders.job.js";
import { makeRollupUsageHandler } from "./jobs/rollup-usage.job.js";
import { makeReconcileSettlementsHandler } from "./jobs/reconcile-settlements.job.js";

export interface BootstrapResult {
  readonly scheduler: Scheduler;
}

/** Build and start the scheduler with all registered jobs. */
export async function bootstrap(container: Container): Promise<BootstrapResult> {
  const logger = container.resolve(LOGGER) as Logger;
  const orderService = container.resolve(ORDER_SVC) as OrderService;
  const usageMeteringService = container.resolve(USAGE_METERING_SVC) as UsageMeteringService;
  const settlementService = container.resolve(SETTLEMENT_SVC) as SettlementService;

  const registry = createJobRegistry();
  const scheduler = new InMemoryScheduler(registry, realTickableClock(), {
    logger,
    tickMs: 10_000,
  });

  const handlers: Record<string, (ctx: JobExecutionContext) => Promise<void>> = {
    "expire-orders": makeExpireOrdersHandler({ orderService, logger }),
    "rollup-usage": makeRollupUsageHandler({ usageMeteringService, logger }),
    "reconcile-settlements": makeReconcileSettlementsHandler({ settlementService, logger }),
  };

  for (const entry of SCHEDULE_TABLE) {
    const handler = handlers[entry.id];
    if (handler === undefined) {
      logger.warn("bootstrap: no handler registered for job", { jobId: entry.id });
      continue;
    }
    await scheduler.register(
      {
        id: entry.id,
        name: entry.name,
        schedule: entry.schedule,
        payload: entry.payload ?? undefined,
        maxRetries: entry.maxRetries ?? 3,
      },
      handler,
    );
    logger.info("bootstrap: registered job", { jobId: entry.id });
  }

  return { scheduler };
}
