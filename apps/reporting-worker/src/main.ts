// Reporting worker entrypoint — bootstraps dependencies and starts the poll loop.
import { createLogger } from "@veritas/observability";
import { InMemoryReportStore, InMemoryReportTemplateStore, InMemoryReportScheduleStore } from "@veritas/reporting";
import { InMemoryJobQueue } from "./queue.js";
import { DEFAULT_WORKER_CONFIG, runWorkerLoop } from "./worker.js";

async function main(): Promise<void> {
  const logger = createLogger({ bindings: { service: "reporting-worker" }, level: "info" });

  const reportStore = new InMemoryReportStore();
  const templateStore = new InMemoryReportTemplateStore();
  const queue = new InMemoryJobQueue();

  const signal = { running: true };

  const shutdown = () => {
    logger.info("Shutdown signal received");
    signal.running = false;
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const deps = { reportStore, templateStore, queue, logger };
  const config = {
    ...DEFAULT_WORKER_CONFIG,
    pollIntervalMs: Number(process.env["POLL_INTERVAL_MS"] ?? 5_000),
  };

  logger.info("Reporting worker initialised", { config });

  await runWorkerLoop(deps, config, signal);

  logger.info("Reporting worker exited cleanly");
  process.exit(0);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal error: ${msg}\n`);
  process.exit(1);
});
