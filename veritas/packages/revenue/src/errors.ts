// Revenue-specific error types extending the core AppError hierarchy.

import { AppError } from "@veritas/core";

export class RevenueError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
    this.name = "RevenueError";
  }
}

export class InsufficientHistoryError extends RevenueError {
  constructor(required: number, provided: number) {
    super(
      `Insufficient snapshot history for revenue calculation: required ${required}, provided ${provided}`,
      { required, provided }
    );
    this.name = "InsufficientHistoryError";
  }
}

export class InvalidChurnRateError extends RevenueError {
  constructor(rate: number) {
    super(
      `Churn rate must be in (0, 1], got ${rate}`,
      { rate }
    );
    this.name = "InvalidChurnRateError";
  }
}

export class InvalidCohortPeriodError extends RevenueError {
  constructor(startMonth: string, endMonth: string) {
    super(
      `Cohort start month "${startMonth}" must not be after end month "${endMonth}"`,
      { startMonth, endMonth }
    );
    this.name = "InvalidCohortPeriodError";
  }
}

export class RevenueReportError extends RevenueError {
  constructor(detail: string) {
    super(`Revenue report generation failed: ${detail}`, { detail });
    this.name = "RevenueReportError";
  }
}

export class UnknownMetricError extends RevenueError {
  constructor(metric: string) {
    super(`Unknown revenue metric: "${metric}"`, { metric });
    this.name = "UnknownMetricError";
  }
}
