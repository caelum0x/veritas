// Integration runtime context — bundles logger, clock, eventBus, and config for flow execution.

import type { Logger, Clock, EventBus } from "@veritas/core";
import type { AppConfig } from "@veritas/config";

/** Immutable runtime context passed to every flow and step. */
export interface IntegrationContext {
  readonly logger: Logger;
  readonly clock: Clock;
  readonly eventBus: EventBus;
  readonly config: AppConfig;
}

/** Create a new IntegrationContext from provided dependencies. */
export function makeContext(deps: {
  logger: Logger;
  clock: Clock;
  eventBus: EventBus;
  config: AppConfig;
}): IntegrationContext {
  return Object.freeze({
    logger: deps.logger,
    clock: deps.clock,
    eventBus: deps.eventBus,
    config: deps.config,
  });
}

/** Derive a child context with an overridden logger (e.g., with bound fields). */
export function withLogger(
  ctx: IntegrationContext,
  logger: Logger
): IntegrationContext {
  return Object.freeze({ ...ctx, logger });
}
