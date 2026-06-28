// Error types for the metrics-layer: metric definition, compilation, and registry errors.
import { AppError } from "@veritas/core";

export class MetricNotFoundError extends AppError {
  constructor(metricName: string) {
    super("NOT_FOUND", 404, `Metric not found: ${metricName}`, {
      details: { metricName },
    });
    this.name = "MetricNotFoundError";
  }
}

export class MetricDefinitionError extends AppError {
  constructor(metricName: string, reason: string) {
    super(
      "VALIDATION",
      422,
      `Invalid metric definition for "${metricName}": ${reason}`,
      { details: { metricName, reason } },
    );
    this.name = "MetricDefinitionError";
  }
}

export class MetricCompilationError extends AppError {
  constructor(metricName: string, reason: string) {
    super(
      "INTERNAL",
      500,
      `Failed to compile metric "${metricName}": ${reason}`,
      { details: { metricName, reason } },
    );
    this.name = "MetricCompilationError";
  }
}

export class MetricRegistryConflictError extends AppError {
  constructor(metricName: string) {
    super("CONFLICT", 409, `Metric already registered: ${metricName}`, {
      details: { metricName },
    });
    this.name = "MetricRegistryConflictError";
  }
}

export class DerivedMetricCycleError extends AppError {
  constructor(cycle: readonly string[]) {
    super(
      "VALIDATION",
      422,
      `Derived metric dependency cycle detected: ${cycle.join(" -> ")}`,
      { details: { cycle } },
    );
    this.name = "DerivedMetricCycleError";
  }
}

export class InvalidTimeGrainError extends AppError {
  constructor(grain: string) {
    super("VALIDATION", 422, `Invalid time grain: ${grain}`, {
      details: { grain },
    });
    this.name = "InvalidTimeGrainError";
  }
}

export class DimensionNotFoundError extends AppError {
  constructor(dimensionId: string) {
    super("NOT_FOUND", 404, `Dimension not found: ${dimensionId}`, {
      details: { dimensionId },
    });
    this.name = "DimensionNotFoundError";
  }
}

export class MetricDefinitionNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Metric definition not found: ${id}`, {
      details: { id },
    });
    this.name = "MetricDefinitionNotFoundError";
  }
}

export type MetricsLayerError =
  | MetricNotFoundError
  | MetricDefinitionError
  | MetricCompilationError
  | MetricRegistryConflictError
  | DerivedMetricCycleError
  | InvalidTimeGrainError
  | DimensionNotFoundError
  | MetricDefinitionNotFoundError;
