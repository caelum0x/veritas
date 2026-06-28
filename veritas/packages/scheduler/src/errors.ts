// Scheduler-specific error types for job scheduling failures and lock contention.
import { AppError } from "@veritas/core";

export class SchedulerError extends AppError {
  constructor(message: string, options?: { cause?: unknown; details?: Record<string, unknown> }) {
    super("INTERNAL", 500, message, {
      message,
      cause: options?.cause,
      details: options?.details,
    });
    this.name = "SchedulerError";
  }
}

export class JobNotFoundError extends AppError {
  constructor(jobId: string) {
    super("NOT_FOUND", 404, `Scheduled job not found: ${jobId}`, {
      message: `Scheduled job not found: ${jobId}`,
    });
    this.name = "JobNotFoundError";
  }
}

export class JobAlreadyExistsError extends AppError {
  constructor(jobId: string) {
    super("CONFLICT", 409, `Scheduled job already registered: ${jobId}`, {
      message: `Scheduled job already registered: ${jobId}`,
    });
    this.name = "JobAlreadyExistsError";
  }
}

export class LockAcquisitionError extends AppError {
  constructor(resource: string) {
    super("RATE_LIMITED", 429, `Failed to acquire distributed lock for resource: ${resource}`, {
      message: `Failed to acquire distributed lock for resource: ${resource}`,
    });
    this.name = "LockAcquisitionError";
  }
}

export class InvalidCronExpressionError extends AppError {
  constructor(expression: string, reason?: string) {
    const msg = `Invalid cron expression "${expression}"${reason ? `: ${reason}` : ""}`;
    super("VALIDATION", 422, msg, { message: msg });
    this.name = "InvalidCronExpressionError";
  }
}

export class JobExecutionError extends AppError {
  constructor(jobId: string, options?: { cause?: unknown }) {
    super("INTERNAL", 500, `Job execution failed: ${jobId}`, {
      message: `Job execution failed: ${jobId}`,
      cause: options?.cause,
    });
    this.name = "JobExecutionError";
  }
}
