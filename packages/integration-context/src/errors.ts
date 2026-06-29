// Integration-specific error types extending @veritas/core AppError hierarchy.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Thrown when a required integration port is not registered. */
export class MissingPortError extends AppError {
  constructor(portName: string, options?: AppErrorOptions) {
    super(
      "INTERNAL",
      500,
      `Required port not registered: ${portName}`,
      options
    );
    this.name = "MissingPortError";
  }
}

/** Thrown when a flow step produces an unexpected result type. */
export class FlowStepError extends AppError {
  constructor(stepName: string, cause?: unknown, options?: AppErrorOptions) {
    super(
      "INTERNAL",
      500,
      `Flow step failed: ${stepName}`,
      { cause: cause instanceof Error ? cause : undefined, ...options }
    );
    this.name = "FlowStepError";
  }
}

/** Thrown when integration context is used before being initialised. */
export class ContextNotInitialisedError extends AppError {
  constructor(options?: AppErrorOptions) {
    super(
      "INTERNAL",
      500,
      "Integration context has not been initialised",
      options
    );
    this.name = "ContextNotInitialisedError";
  }
}

/** Thrown when a flow times out. */
export class FlowTimeoutError extends AppError {
  constructor(flowName: string, timeoutMs: number, options?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `Flow '${flowName}' timed out after ${timeoutMs}ms`,
      options
    );
    this.name = "FlowTimeoutError";
  }
}
