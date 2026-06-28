// Query-engine error types: structured errors for parse, plan, and execution failures.
import { AppError } from "@veritas/core";

export class QueryParseError extends AppError {
  constructor(message: string, readonly position?: number) {
    super("VALIDATION", 400, message);
    this.name = "QueryParseError";
  }
}

export class QueryPlanError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, message);
    this.name = "QueryPlanError";
  }
}

export class QueryExecutionError extends AppError {
  constructor(message: string, readonly cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "QueryExecutionError";
  }
}

export class QueryTimeoutError extends AppError {
  constructor(readonly timeoutMs: number) {
    super("UNAVAILABLE", 503, `Query exceeded timeout of ${timeoutMs}ms`);
    this.name = "QueryTimeoutError";
  }
}

export class InvalidProjectionError extends AppError {
  constructor(column: string) {
    super("VALIDATION", 400, `Unknown projection column: ${column}`);
    this.name = "InvalidProjectionError";
  }
}

export class InvalidJoinError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 400, message);
    this.name = "InvalidJoinError";
  }
}

export type QueryEngineError =
  | QueryParseError
  | QueryPlanError
  | QueryExecutionError
  | QueryTimeoutError
  | InvalidProjectionError
  | InvalidJoinError;
