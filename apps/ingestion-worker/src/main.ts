// Ingestion worker entrypoint: bootstraps dependencies and starts the poll loop.

import { createLogger } from "@veritas/observability";
import { bootstrap } from "./bootstrap.js";

const logger = createLogger({
  level: process.env["LOG_LEVEL"] ?? "info",
  bindings: { service: "ingestion-worker" },
});

async function main(): Promise<void> {
  logger.info("ingestion-worker: initialising");

  const { worker, config } = bootstrap(logger);

  // Graceful shutdown on SIGTERM / SIGINT.
  const shutdown = (): void => {
    logger.info("ingestion-worker: shutdown signal received");
    worker.stop();
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  logger.info("ingestion-worker: starting poll loop", {
    concurrency: config.concurrency,
    pollIntervalMs: config.pollIntervalMs,
    verificationEnabled: config.verificationEnabled,
  });

  await worker.start();

  logger.info("ingestion-worker: exiting");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error("ingestion-worker: fatal error", { message });
  process.exitCode = 1;
});
