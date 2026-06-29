// Start the Veritas background worker: processes verification jobs, webhooks, and settlements.

import { noopLogger, sleep } from "@veritas/core";

/** Environment-loaded worker parameters. */
interface WorkerRunConfig {
  readonly pollIntervalMs: number;
  readonly concurrency: number;
  readonly shutdownGracePeriodMs: number;
  readonly orderExpiryThresholdMs: number;
  readonly settlementLookbackMs: number;
  readonly usageAggregationWindowMs: number;
}

function loadWorkerRunConfig(): WorkerRunConfig {
  const envInt = (key: string, fallback: number): number => {
    const raw = process.env[key];
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    pollIntervalMs: envInt("WORKER_POLL_INTERVAL_MS", 1_000),
    concurrency: envInt("WORKER_CONCURRENCY", 5),
    shutdownGracePeriodMs: envInt("WORKER_SHUTDOWN_GRACE_MS", 5_000),
    orderExpiryThresholdMs: envInt("WORKER_ORDER_EXPIRY_THRESHOLD_MS", 3_600_000),
    settlementLookbackMs: envInt("WORKER_SETTLEMENT_LOOKBACK_MS", 3_600_000),
    usageAggregationWindowMs: envInt("WORKER_USAGE_AGGREGATION_WINDOW_MS", 3_600_000),
  };
}

/** Supported job types dispatched by the scheduler. */
type JobType =
  | "run-verification"
  | "deliver-webhook"
  | "generate-invoice"
  | "reconcile-settlements"
  | "expire-orders"
  | "aggregate-usage";

/** A minimal in-memory job entry. */
interface Job {
  readonly id: string;
  readonly type: JobType;
  readonly payload: Record<string, unknown>;
  readonly enqueuedAt: number;
}

/** Simple in-memory queue (mirrors the structure used by the apps/worker package). */
class InMemoryQueue {
  private readonly jobs: Job[] = [];
  private counter = 0;

  enqueue(type: JobType, payload: Record<string, unknown> = {}): string {
    const id = `job-${++this.counter}`;
    this.jobs.push({ id, type, payload, enqueuedAt: Date.now() });
    return id;
  }

  dequeue(count: number): Job[] {
    return this.jobs.splice(0, count);
  }

  get length(): number {
    return this.jobs.length;
  }
}

/** Handler registry — maps job types to async handler functions. */
type HandlerFn = (job: Job) => Promise<void>;

function buildHandlers(): Map<JobType, HandlerFn> {
  const log = noopLogger;

  return new Map<JobType, HandlerFn>([
    [
      "run-verification",
      async (job) => {
        log.info("[worker] run-verification", { jobId: job.id, payload: job.payload });
      },
    ],
    [
      "deliver-webhook",
      async (job) => {
        log.info("[worker] deliver-webhook", { jobId: job.id });
      },
    ],
    [
      "generate-invoice",
      async (job) => {
        log.info("[worker] generate-invoice", { jobId: job.id });
      },
    ],
    [
      "reconcile-settlements",
      async (job) => {
        log.info("[worker] reconcile-settlements", { jobId: job.id });
      },
    ],
    [
      "expire-orders",
      async (job) => {
        log.info("[worker] expire-orders", { jobId: job.id });
      },
    ],
    [
      "aggregate-usage",
      async (job) => {
        log.info("[worker] aggregate-usage", { jobId: job.id });
      },
    ],
  ]);
}

/** Scheduler that periodically enqueues recurring jobs. */
function startScheduler(queue: InMemoryQueue, cfg: WorkerRunConfig): NodeJS.Timeout {
  const RECONCILE_INTERVAL_MS = cfg.settlementLookbackMs;
  const EXPIRE_INTERVAL_MS = cfg.orderExpiryThresholdMs;
  const AGGREGATE_INTERVAL_MS = cfg.usageAggregationWindowMs;
  const INVOICE_INTERVAL_MS = 24 * 60 * 60 * 1_000; // daily

  let lastReconcile = 0;
  let lastExpire = 0;
  let lastAggregate = 0;
  let lastInvoice = 0;

  return setInterval(() => {
    const now = Date.now();
    if (now - lastReconcile >= RECONCILE_INTERVAL_MS) {
      queue.enqueue("reconcile-settlements", { triggeredAt: now });
      lastReconcile = now;
    }
    if (now - lastExpire >= EXPIRE_INTERVAL_MS) {
      queue.enqueue("expire-orders", { triggeredAt: now });
      lastExpire = now;
    }
    if (now - lastAggregate >= AGGREGATE_INTERVAL_MS) {
      queue.enqueue("aggregate-usage", { triggeredAt: now });
      lastAggregate = now;
    }
    if (now - lastInvoice >= INVOICE_INTERVAL_MS) {
      queue.enqueue("generate-invoice", { triggeredAt: now });
      lastInvoice = now;
    }
  }, 5_000);
}

async function main(): Promise<void> {
  const cfg = loadWorkerRunConfig();

  console.log("=== Veritas Background Worker ===");
  console.log(`Poll interval : ${cfg.pollIntervalMs} ms`);
  console.log(`Concurrency   : ${cfg.concurrency}`);
  console.log(`Grace period  : ${cfg.shutdownGracePeriodMs} ms`);

  const queue = new InMemoryQueue();
  const handlers = buildHandlers();

  let running = true;
  let processed = 0;
  let failed = 0;

  const schedulerHandle = startScheduler(queue, cfg);

  const shutdown = (): void => {
    console.log("\n[worker] Shutdown signal received — draining queue…");
    running = false;
    clearInterval(schedulerHandle);
    void sleep(cfg.shutdownGracePeriodMs).then(() => {
      console.log(`[worker] Stopped. processed=${processed} failed=${failed}`);
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log("[worker] Running…");

  while (running) {
    const batch = queue.dequeue(cfg.concurrency);

    if (batch.length > 0) {
      await Promise.allSettled(
        batch.map(async (job) => {
          const handler = handlers.get(job.type);
          if (!handler) {
            console.warn(`[worker] No handler for job type: ${job.type}`);
            failed++;
            return;
          }
          try {
            await handler(job);
            processed++;
          } catch (e: unknown) {
            failed++;
            console.error(
              `[worker] Job ${job.id} (${job.type}) failed:`,
              e instanceof Error ? e.message : String(e),
            );
          }
        }),
      );
    }

    await sleep(cfg.pollIntervalMs);
  }
}

main().catch((err: unknown) => {
  console.error("run-worker failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
