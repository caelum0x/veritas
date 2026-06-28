// Domain errors for api-analytics module
import { AppError } from "@veritas/core";

export class AnalyticsStoreError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "AnalyticsStoreError";
  }
}

export class InvalidTimeWindowError extends AppError {
  constructor(window: string) {
    super("VALIDATION", 400, `Invalid time window: ${window}`);
    this.name = "InvalidTimeWindowError";
  }
}

export class ConsumerNotFoundError extends AppError {
  constructor(consumerId: string) {
    super("NOT_FOUND", 404, `Consumer not found: ${consumerId}`);
    this.name = "ConsumerNotFoundError";
  }
}

export class EndpointNotFoundError extends AppError {
  constructor(endpoint: string) {
    super("NOT_FOUND", 404, `Endpoint not found: ${endpoint}`);
    this.name = "EndpointNotFoundError";
  }
}
