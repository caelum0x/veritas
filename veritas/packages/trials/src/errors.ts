// Domain-specific errors for the trials module
import { AppError } from "@veritas/core";
import type { TrialId, TrialStatus } from "./types.js";

export class TrialNotFoundError extends AppError {
  constructor(trialId: TrialId) {
    super("NOT_FOUND", 404, `Trial '${trialId}' not found`, {
      details: { trialId },
    });
    this.name = "TrialNotFoundError";
  }
}

export class TrialAlreadyActiveError extends AppError {
  constructor(userId: string) {
    super("CONFLICT", 409, `User '${userId}' already has an active trial`, {
      details: { userId },
    });
    this.name = "TrialAlreadyActiveError";
  }
}

export class TrialNotActiveError extends AppError {
  constructor(trialId: TrialId, status: TrialStatus) {
    super("CONFLICT", 409, `Trial '${trialId}' is not active (current status: ${status})`, {
      details: { trialId, status },
    });
    this.name = "TrialNotActiveError";
  }
}

export class TrialExtensionLimitError extends AppError {
  constructor(trialId: TrialId, maxExtensions: number) {
    super("CONFLICT", 409, `Trial '${trialId}' has reached the maximum extension limit of ${maxExtensions}`, {
      details: { trialId, maxExtensions },
    });
    this.name = "TrialExtensionLimitError";
  }
}

export class ReminderAlreadySentError extends AppError {
  constructor(trialId: TrialId, kind: string) {
    super("CONFLICT", 409, `Reminder '${kind}' already sent for trial '${trialId}'`, {
      details: { trialId, kind },
    });
    this.name = "ReminderAlreadySentError";
  }
}

export class InvalidExtensionDaysError extends AppError {
  constructor(days: number) {
    super("VALIDATION", 422, `Extension days must be between 1 and 90, got ${days}`, {
      details: { days },
    });
    this.name = "InvalidExtensionDaysError";
  }
}
