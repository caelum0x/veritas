// Entrypoint: bootstrap the publisher and start the periodic anchoring scheduler.

import { bootstrap } from "./bootstrap.js";
import { PublisherService } from "./publisher-service.js";
import { PublisherScheduler } from "./scheduler.js";

async function main(): Promise<void> {
  const container = bootstrap();
  const { config, logger, queue, statusTracker, submitPort } = container;

  const service = new PublisherService(queue, submitPort, statusTracker, config, logger);
  const scheduler = new PublisherScheduler(service, config, logger);

  const shutdown = (): void => {
    logger.info("shutdown signal received — stopping scheduler");
    scheduler.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  scheduler.start();

  logger.info(
    "attestation-publisher running",
    { chainId: config.chainId, batchSize: config.batchSize, intervalMs: config.intervalMs },
  );
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("fatal error in attestation-publisher", err);
  process.exit(1);
});
