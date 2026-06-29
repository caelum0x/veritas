// Analytics-specific error types extending AppError conventions
import { AppError } from "@veritas/core";

export class AnalyticsStoreError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
    this.name = "AnalyticsStoreError";
  }
}

export class AnalyticsQueryError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
    this.name = "AnalyticsQueryError";
  }
}

export class AnalyticsAggregationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
    this.name = "AnalyticsAggregationError";
  }
}

export class AnalyticsReportError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
    this.name = "AnalyticsReportError";
  }
}

export type AnalyticsError =
  | AnalyticsStoreError
  | AnalyticsQueryError
  | AnalyticsAggregationError
  | AnalyticsReportError;
