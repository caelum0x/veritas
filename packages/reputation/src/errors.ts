// Domain-specific error classes for the reputation module.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Thrown when a reputation record is not found for a given agent. */
export class ReputationNotFoundError extends AppError {
  constructor(agentId: string, options?: Partial<AppErrorOptions>) {
    super(
      "NOT_FOUND",
      404,
      `Reputation record not found for agent: ${agentId}`,
      options,
    );
    this.name = "ReputationNotFoundError";
  }
}

/** Thrown when a duplicate reputation event is submitted. */
export class DuplicateReputationEventError extends AppError {
  constructor(eventId: string, options?: Partial<AppErrorOptions>) {
    super(
      "CONFLICT",
      409,
      `Reputation event already recorded: ${eventId}`,
      options,
    );
    this.name = "DuplicateReputationEventError";
  }
}

/** Thrown when a score calculation cannot proceed due to insufficient data. */
export class InsufficientReputationDataError extends AppError {
  constructor(agentId: string, options?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Insufficient reputation events to calculate score for agent: ${agentId}`,
      options,
    );
    this.name = "InsufficientReputationDataError";
  }
}

/** Thrown when a score history entry cannot be stored. */
export class ReputationHistoryWriteError extends AppError {
  constructor(agentId: string, options?: Partial<AppErrorOptions>) {
    super(
      "INTERNAL",
      500,
      `Failed to write reputation history for agent: ${agentId}`,
      options,
    );
    this.name = "ReputationHistoryWriteError";
  }
}
