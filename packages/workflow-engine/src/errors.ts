// Workflow-engine-specific error types extending AppError.
import { AppError } from "@veritas/core";
import type { WorkflowId, ExecutionId, ActivityId } from "./types.js";

export class WorkflowNotFoundError extends AppError {
  constructor(workflowId: WorkflowId | ExecutionId) {
    super("NOT_FOUND", 404, `Workflow not found: ${workflowId}`);
  }
}

export class WorkflowAlreadyExistsError extends AppError {
  constructor(workflowId: WorkflowId) {
    super("CONFLICT", 409, `Workflow already exists: ${workflowId}`);
  }
}

export class WorkflowInvalidStateError extends AppError {
  constructor(executionId: ExecutionId, current: string, expected: string) {
    super(
      "VALIDATION",
      422,
      `Workflow ${executionId} is in state ${current}, expected ${expected}`
    );
  }
}

export class ActivityFailedError extends AppError {
  constructor(
    activityId: ActivityId,
    cause: unknown,
    public readonly attempts: number
  ) {
    const msg =
      cause instanceof Error ? cause.message : String(cause);
    super("INTERNAL", 500, `Activity ${activityId} failed after ${attempts} attempts: ${msg}`, { cause });
  }
}

export class WorkflowTimeoutError extends AppError {
  constructor(executionId: ExecutionId) {
    super("UNAVAILABLE", 503, `Workflow execution timed out: ${executionId}`);
  }
}

export class ReplayError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, `Replay error: ${message}`);
  }
}

export class WorkflowCancelledError extends AppError {
  constructor(executionId: ExecutionId, reason: string) {
    super("UNAVAILABLE", 503, `Workflow ${executionId} was cancelled: ${reason}`);
  }
}

export class SignalNotFoundError extends AppError {
  constructor(signalName: string) {
    super("NOT_FOUND", 404, `No handler registered for signal: ${signalName}`);
  }
}

export class CompensationError extends AppError {
  constructor(message: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super("INTERNAL", 500, `Compensation failed — ${message}: ${detail}`, { cause });
  }
}

export class WorkerShutdownError extends AppError {
  constructor() {
    super("UNAVAILABLE", 503, "Workflow worker is shutting down");
  }
}
