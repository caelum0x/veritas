// Dunning-domain error types extending the core AppError hierarchy.

import { NotFoundError, ConflictError, ValidationError } from "@veritas/core";

/** Raised when a dunning record cannot be located by its ID. */
export class DunningNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Dunning record not found: ${id}`, details: { entity: "Dunning", id } });
  }
}

/** Raised when a payment attempt record cannot be located. */
export class AttemptNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Payment attempt not found: ${id}`, details: { entity: "DunningAttempt", id } });
  }
}

/** Raised when a dunning reminder record cannot be located. */
export class ReminderNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Dunning reminder not found: ${id}`, details: { entity: "DunningReminder", id } });
  }
}

/** Raised when a recovery record cannot be located. */
export class RecoveryNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Recovery record not found: ${id}`, details: { entity: "Recovery", id } });
  }
}

/** Raised when an operation conflicts with the current dunning status. */
export class DunningStatusConflictError extends ConflictError {
  constructor(id: string, currentStatus: string, requiredStatus: string) {
    super({
      message: `Dunning ${id} is in status '${currentStatus}', expected '${requiredStatus}'`,
      details: { entity: "Dunning", id, currentStatus, requiredStatus },
    });
  }
}

/** Raised when max retry attempts have been exhausted for a dunning cycle. */
export class MaxAttemptsExhaustedError extends ConflictError {
  constructor(dunningId: string, maxAttempts: number) {
    super({
      message: `Dunning ${dunningId} has exhausted all ${maxAttempts} retry attempts`,
      details: { entity: "Dunning", dunningId, maxAttempts },
    });
  }
}

/** Raised when a dunning operation is attempted on an already-recovered subscription. */
export class AlreadyRecoveredError extends ConflictError {
  constructor(dunningId: string) {
    super({
      message: `Dunning ${dunningId} has already been recovered`,
      details: { entity: "Dunning", dunningId },
    });
  }
}

/** Raised when retry schedule configuration fails validation. */
export class InvalidRetryScheduleError extends ValidationError {
  constructor(reason: string) {
    super({ message: `Invalid retry schedule: ${reason}`, issues: [] });
  }
}

/** Raised when grace period configuration is invalid. */
export class InvalidGracePeriodError extends ValidationError {
  constructor(reason: string) {
    super({ message: `Invalid grace period configuration: ${reason}`, issues: [] });
  }
}
