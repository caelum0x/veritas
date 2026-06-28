// Domain errors for queue-advanced operations.
import { AppError } from "@veritas/core";

export class QueueEmptyError extends AppError {
  constructor() {
    super("NOT_FOUND", 404, "Queue is empty");
  }
}

export class QueueFullError extends AppError {
  constructor(capacity: number) {
    super("UNAVAILABLE", 429, `Queue capacity (${capacity}) exceeded`);
  }
}

export class PartitionNotFoundError extends AppError {
  constructor(key: string) {
    super("NOT_FOUND", 404, `Partition '${key}' not found`);
  }
}

export class RateLimitExceededError extends AppError {
  constructor(ratePerSecond: number) {
    super(
      "RATE_LIMITED",
      429,
      `Consume rate limit of ${ratePerSecond}/s exceeded`
    );
  }
}

export class DeadLetterError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, `Dead letter queue error: ${detail}`);
  }
}

export class ReceiptNotFoundError extends AppError {
  constructor(receiptHandle: string) {
    super(
      "NOT_FOUND",
      404,
      `Receipt handle '${receiptHandle}' not found or expired`
    );
  }
}

export class SchedulerError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, `Scheduler error: ${detail}`);
  }
}
