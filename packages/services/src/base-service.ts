// Shared service base class providing logger and context helpers.
import { Logger, noopLogger, Clock, systemClock, epochToIso, type IsoTimestamp } from "@veritas/core";
import type { ServiceContext } from "./service-context.js";

/** Dependencies shared by all application services. */
export interface BaseServiceDeps {
  readonly logger: Logger;
  readonly clock: Clock;
}

/** Default dependency values so concrete services can omit optional deps. */
const defaultDeps: BaseServiceDeps = {
  logger: noopLogger,
  clock: systemClock,
};

/**
 * Abstract base for all application services.
 * Provides a logger scoped to the service name and a clock for timestamps.
 */
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly clock: Clock;

  constructor(deps: Partial<BaseServiceDeps> = {}) {
    const resolved = { ...defaultDeps, ...deps };
    this.logger = resolved.logger.child
      ? resolved.logger.child({ service: this.constructor.name })
      : resolved.logger;
    this.clock = resolved.clock;
  }

  /** Emit a structured log entry scoped to this request context. */
  protected log(
    ctx: ServiceContext,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.logger[level](message, {
      traceId: ctx.traceId,
      requestId: ctx.requestId,
      userId: ctx.principal.userId,
      orgId: ctx.principal.orgId,
      ...data,
    });
  }

  /** Return the current UTC timestamp as a branded IsoTimestamp. */
  protected now(): IsoTimestamp {
    return epochToIso(this.clock.now());
  }
}
