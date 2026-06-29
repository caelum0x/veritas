// Wire all attestation-publisher dependencies and return a ready-to-use container.

import { createLogger } from "@veritas/observability";
import { loadPublisherConfig } from "./config.js";
import { AttestationQueue } from "./queue.js";
import { AnchorStatusTracker } from "./status.js";
import { MockAnchorSubmitPort } from "./submit.js";
import type { AnchorSubmitPort } from "./submit.js";
import type { PublisherConfig } from "./config.js";
import type { Logger } from "@veritas/observability";

/** All runtime dependencies for the attestation publisher. */
export interface PublisherContainer {
  readonly config: PublisherConfig;
  readonly logger: Logger;
  readonly queue: AttestationQueue;
  readonly statusTracker: AnchorStatusTracker;
  readonly submitPort: AnchorSubmitPort;
}

/**
 * Build the publisher container from environment variables.
 * Throws immediately on misconfiguration to enforce fail-fast startup.
 */
export function bootstrap(): PublisherContainer {
  const config = loadPublisherConfig();

  const logger = createLogger({
    level: process.env["LOG_LEVEL"] ?? "info",
    bindings: { service: "attestation-publisher", chainId: config.chainId },
  });

  const queue = new AttestationQueue();
  const statusTracker = new AnchorStatusTracker();

  // Production: swap MockAnchorSubmitPort for a real EVM-backed port.
  const submitPort: AnchorSubmitPort = new MockAnchorSubmitPort();

  logger.info("attestation-publisher bootstrapped", {
    chainId: config.chainId,
    contractAddress: config.contractAddress,
    batchSize: config.batchSize,
    intervalMs: config.intervalMs,
  });

  return Object.freeze({ config, logger, queue, statusTracker, submitPort });
}
