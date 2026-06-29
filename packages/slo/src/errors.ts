// SLO-specific error types extending AppError hierarchy.
import { NotFoundError, ConflictError, ValidationError, UnavailableError, InternalError, type AppErrorOptions } from "@veritas/core";

export class SloNotFoundError extends NotFoundError {
  constructor(id: string, opts?: AppErrorOptions) {
    super({ ...opts, message: `SLO not found: ${id}` });
  }
}

export class SloConflictError extends ConflictError {
  constructor(name: string, opts?: AppErrorOptions) {
    super({ ...opts, message: `SLO already exists: ${name}` });
  }
}

export class SloValidationError extends ValidationError {
  constructor(detail: string, opts?: AppErrorOptions) {
    super({ ...opts, message: `SLO validation error: ${detail}` });
  }
}

export class SloBudgetExhaustedError extends UnavailableError {
  constructor(sloId: string, opts?: AppErrorOptions) {
    super({ ...opts, message: `Error budget exhausted for SLO: ${sloId}` });
  }
}

export class SloEvaluationError extends InternalError {
  constructor(detail: string, opts?: AppErrorOptions) {
    super({ ...opts, message: `SLO evaluation failed: ${detail}` });
  }
}
