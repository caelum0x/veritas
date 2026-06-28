// Timeseries-specific error types extending AppError
import { AppError } from "@veritas/core";

export class TimeseriesNotFoundError extends AppError {
  constructor(seriesId: string) {
    super("NOT_FOUND", 404, `Timeseries not found: ${seriesId}`);
    this.name = "TimeseriesNotFoundError";
  }
}

export class InvalidTimeRangeError extends AppError {
  constructor(from: number, to: number) {
    super("VALIDATION", 400, `Invalid time range: from=${from} to=${to}`);
    this.name = "InvalidTimeRangeError";
  }
}

export class DuplicateSeriesError extends AppError {
  constructor(seriesId: string) {
    super("CONFLICT", 409, `Timeseries already exists: ${seriesId}`);
    this.name = "DuplicateSeriesError";
  }
}

export class AggregationError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, `Aggregation failed: ${detail}`);
    this.name = "AggregationError";
  }
}

export class RetentionError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Retention policy error: ${detail}`);
    this.name = "RetentionError";
  }
}
