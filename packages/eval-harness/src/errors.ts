// Domain errors for the eval-harness package.

/** Thrown when an eval dataset is malformed or cannot be loaded. */
export class DatasetError extends Error {
  readonly code = "DATASET_ERROR" as const;
  readonly status = 400;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(message: string, opts?: { cause?: unknown; details?: Readonly<Record<string, unknown>> }) {
    super(message, { cause: opts?.cause });
    this.name = "DatasetError";
    this.details = opts?.details ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an eval case fails to execute. */
export class CaseExecutionError extends Error {
  readonly code = "CASE_EXECUTION_ERROR" as const;
  readonly status = 500;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(message: string, opts?: { cause?: unknown; details?: Readonly<Record<string, unknown>> }) {
    super(message, { cause: opts?.cause });
    this.name = "CaseExecutionError";
    this.details = opts?.details ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a metric computation fails. */
export class MetricError extends Error {
  readonly code = "METRIC_ERROR" as const;
  readonly status = 500;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(message: string, opts?: { cause?: unknown; details?: Readonly<Record<string, unknown>> }) {
    super(message, { cause: opts?.cause });
    this.name = "MetricError";
    this.details = opts?.details ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when regression detection fails. */
export class RegressionError extends Error {
  readonly code = "REGRESSION_ERROR" as const;
  readonly status = 500;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(message: string, opts?: { cause?: unknown; details?: Readonly<Record<string, unknown>> }) {
    super(message, { cause: opts?.cause });
    this.name = "RegressionError";
    this.details = opts?.details ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a baseline operation (save/load/delete) fails. */
export class BaselineError extends Error {
  readonly code = "BASELINE_ERROR" as const;
  readonly status = 500;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(message: string, opts?: { cause?: unknown; details?: Readonly<Record<string, unknown>> }) {
    super(message, { cause: opts?.cause });
    this.name = "BaselineError";
    this.details = opts?.details ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the eval store encounters a persistence failure. */
export class StoreError extends Error {
  readonly code = "STORE_ERROR" as const;
  readonly status = 500;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(message: string, opts?: { cause?: unknown; details?: Readonly<Record<string, unknown>> }) {
    super(message, { cause: opts?.cause });
    this.name = "StoreError";
    this.details = opts?.details ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
