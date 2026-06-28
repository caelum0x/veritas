// Bootstraps the event-wiring bridges for the webhook-gateway service.

import type { Logger } from "@veritas/observability";
import { bootstrap, type BootstrapResult } from "@veritas/event-wiring";
import type { WiringError } from "@veritas/event-wiring";
import type { Result } from "@veritas/core";

export async function bootstrapEventWiring(
  logger: Logger,
): Promise<Result<BootstrapResult, WiringError>> {
  return bootstrap({
    logger,
    projections: [],
  });
}
