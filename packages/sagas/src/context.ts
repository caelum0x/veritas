// SagaContext: immutable execution context threaded through saga steps.
import type { Logger } from "@veritas/observability";

export interface SagaContext {
  /** Unique identifier for this saga run. */
  readonly sagaId: string;
  /** Human-readable name of the saga definition. */
  readonly sagaName: string;
  /** Shared logger scoped to this saga run. */
  readonly logger: Logger;
  /** Arbitrary key-value bag populated by steps and passed forward. */
  readonly data: Readonly<Record<string, unknown>>;
}

/** Return a new context with merged data (non-mutating). */
export function extendSagaContext(
  ctx: SagaContext,
  extra: Record<string, unknown>,
): SagaContext {
  return { ...ctx, data: { ...ctx.data, ...extra } };
}

/** Create the root context for a new saga run. */
export function createSagaContext(
  sagaId: string,
  sagaName: string,
  logger: Logger,
  initialData?: Record<string, unknown>,
): SagaContext {
  return {
    sagaId,
    sagaName,
    logger: logger,
    data: { ...(initialData ?? {}) },
  };
}
