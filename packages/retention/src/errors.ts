// Domain-specific error types for the retention module.
import { AppError } from "@veritas/core";

/** Thrown when a retention policy cannot be found by id or category. */
export class PolicyNotFoundError extends AppError {
  constructor(identifier: string) {
    super("NOT_FOUND", 404, `Retention policy not found: ${identifier}`, {
      details: { identifier },
    });
    this.name = "PolicyNotFoundError";
  }
}

/** Thrown when attempting to create a policy that conflicts with an existing one. */
export class PolicyConflictError extends AppError {
  constructor(name: string) {
    super("CONFLICT", 409, `Retention policy already exists with name: ${name}`, {
      details: { name },
    });
    this.name = "PolicyConflictError";
  }
}

/** Thrown when a legal hold cannot be found. */
export class LegalHoldNotFoundError extends AppError {
  constructor(holdId: string) {
    super("NOT_FOUND", 404, `Legal hold not found: ${holdId}`, { details: { holdId } });
    this.name = "LegalHoldNotFoundError";
  }
}

/** Thrown when a purge is attempted on a record protected by an active legal hold. */
export class LegalHoldViolationError extends AppError {
  constructor(recordId: string, holdId: string) {
    super(
      "FORBIDDEN",
      403,
      `Cannot purge record ${recordId}: protected by legal hold ${holdId}`,
      { details: { recordId, holdId } }
    );
    this.name = "LegalHoldViolationError";
  }
}

/** Thrown when a retention schedule is not found. */
export class ScheduleNotFoundError extends AppError {
  constructor(scheduleId: string) {
    super("NOT_FOUND", 404, `Retention schedule not found: ${scheduleId}`, {
      details: { scheduleId },
    });
    this.name = "ScheduleNotFoundError";
  }
}

/** Thrown when purge configuration or inputs are invalid. */
export class PurgeConfigError extends AppError {
  constructor(reason: string) {
    super("VALIDATION", 422, `Purge configuration error: ${reason}`, { details: { reason } });
    this.name = "PurgeConfigError";
  }
}
