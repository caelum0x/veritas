// Saga-specific error types for orchestration, compensation, and state failures.
import { AppError, type AppErrorOptions } from "@veritas/core";

/** Thrown when a requested saga instance is not found in the state store. */
export class SagaNotFoundError extends AppError {
  constructor(sagaId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Saga not found: ${sagaId}`, opts);
  }
}

/** Thrown when attempting to start a saga that already exists. */
export class SagaAlreadyCompletedError extends AppError {
  constructor(sagaId: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Saga already exists: ${sagaId}`, opts);
  }
}

/** Thrown when a compensation handler fails during saga rollback. */
export class SagaCompensationError extends AppError {
  readonly stepName: string;
  constructor(sagaId: string, stepName: string, cause?: unknown) {
    super("INTERNAL", 500, `Compensation failed for step '${stepName}' in saga ${sagaId}`, {
      cause: cause instanceof Error ? cause : undefined,
      details: { sagaId, stepName },
    });
    this.stepName = stepName;
  }
}

/** Thrown when a step action fails and compensation should be triggered. */
export class SagaStepError extends AppError {
  readonly stepName: string;
  constructor(sagaId: string, stepName: string, cause?: unknown) {
    super("INTERNAL", 500, `Step '${stepName}' failed in saga ${sagaId}`, {
      cause: cause instanceof Error ? cause : undefined,
      details: { sagaId, stepName },
    });
    this.stepName = stepName;
  }
}
