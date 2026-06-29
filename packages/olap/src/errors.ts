// Domain errors for the @veritas/olap module.
import { AppError } from "@veritas/core";

export class CubeNotFoundError extends AppError {
  constructor(cubeName: string) {
    super("NOT_FOUND", 404, `OLAP cube not found: ${cubeName}`);
  }
}

export class MeasureNotFoundError extends AppError {
  constructor(measureName: string) {
    super("NOT_FOUND", 404, `Measure not found: ${measureName}`);
  }
}

export class DimensionNotFoundError extends AppError {
  constructor(dimName: string) {
    super("NOT_FOUND", 404, `Dimension not found: ${dimName}`);
  }
}

export class InvalidSliceError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Invalid slice: ${detail}`);
  }
}

export class InvalidDrillError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Invalid drill operation: ${detail}`);
  }
}

export class AggregationError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, `Aggregation failed: ${detail}`);
  }
}

export class QueryError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `OLAP query error: ${detail}`);
  }
}

export class InvalidQueryError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `OLAP query error: ${detail}`);
  }
}

export class InvalidPivotError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Invalid pivot: ${detail}`);
  }
}

export class InvalidRollupError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 400, `Invalid rollup: ${detail}`);
  }
}
