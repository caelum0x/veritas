// Gateway-specific error types extending core AppError hierarchy

import {
  AppError,
  AppErrorOptions,
  ErrorCode,
} from "@veritas/core";

export class GatewayError extends AppError {
  constructor(code: ErrorCode, status: number, message: string, options?: AppErrorOptions) {
    super(code, status, message, options);
    this.name = "GatewayError";
  }
}

export class UpstreamUnavailableError extends GatewayError {
  readonly upstreamId: string;

  constructor(upstreamId: string, cause?: unknown) {
    super(
      "UNAVAILABLE",
      503,
      `Upstream ${upstreamId} is unavailable`,
      { cause, details: { upstreamId } },
    );
    this.name = "UpstreamUnavailableError";
    this.upstreamId = upstreamId;
  }
}

export class CircuitOpenError extends GatewayError {
  readonly upstreamId: string;

  constructor(upstreamId: string) {
    super(
      "UNAVAILABLE",
      503,
      `Circuit breaker open for upstream ${upstreamId}`,
      { details: { upstreamId } },
    );
    this.name = "CircuitOpenError";
    this.upstreamId = upstreamId;
  }
}

export class UpstreamTimeoutError extends GatewayError {
  readonly upstreamId: string;
  readonly timeoutMs: number;

  constructor(upstreamId: string, timeoutMs: number) {
    super(
      "UNAVAILABLE",
      504,
      `Upstream ${upstreamId} timed out after ${timeoutMs}ms`,
      { details: { upstreamId, timeoutMs } },
    );
    this.name = "UpstreamTimeoutError";
    this.upstreamId = upstreamId;
    this.timeoutMs = timeoutMs;
  }
}

export class RouteNotFoundError extends GatewayError {
  readonly path: string;
  readonly method: string;

  constructor(method: string, path: string) {
    super(
      "NOT_FOUND",
      404,
      `No route matched ${method} ${path}`,
      { details: { method, path } },
    );
    this.name = "RouteNotFoundError";
    this.path = path;
    this.method = method;
  }
}

export class ProxyError extends GatewayError {
  readonly upstreamId: string;
  readonly statusCode: number;

  constructor(upstreamId: string, statusCode: number, message: string, cause?: unknown) {
    super(
      "INTERNAL",
      502,
      `Proxy error from ${upstreamId}: ${message}`,
      { cause, details: { upstreamId, statusCode } },
    );
    this.name = "ProxyError";
    this.upstreamId = upstreamId;
    this.statusCode = statusCode;
  }
}

export class AggregationError extends GatewayError {
  readonly partialResults: number;
  readonly totalRequests: number;

  constructor(partialResults: number, totalRequests: number, cause?: unknown) {
    super(
      "INTERNAL",
      500,
      `Aggregation failed: ${partialResults}/${totalRequests} requests succeeded`,
      { cause, details: { partialResults, totalRequests } },
    );
    this.name = "AggregationError";
    this.partialResults = partialResults;
    this.totalRequests = totalRequests;
  }
}

export function isGatewayError(value: unknown): value is GatewayError {
  return value instanceof GatewayError;
}

export function isUpstreamUnavailableError(value: unknown): value is UpstreamUnavailableError {
  return value instanceof UpstreamUnavailableError;
}

export function isCircuitOpenError(value: unknown): value is CircuitOpenError {
  return value instanceof CircuitOpenError;
}

export function isRouteNotFoundError(value: unknown): value is RouteNotFoundError {
  return value instanceof RouteNotFoundError;
}
