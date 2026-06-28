// Gateway-specific error types for structured error propagation within the agent-gateway.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Error raised when the gateway cannot parse an inbound request. */
export class GatewayRequestError extends AppError {
  readonly code = "GATEWAY_REQUEST_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("VALIDATION", 400, message, opts);
    this.name = "GatewayRequestError";
  }
}

/** Error raised when the gateway cannot reach a downstream service. */
export class GatewayUpstreamError extends AppError {
  readonly code = "GATEWAY_UPSTREAM_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("UNAVAILABLE", 502, message, opts);
    this.name = "GatewayUpstreamError";
  }
}

/** Error raised when the gateway rejects a request due to auth failure. */
export class GatewayAuthError extends AppError {
  readonly code = "GATEWAY_AUTH_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("UNAUTHORIZED", 401, message, opts);
    this.name = "GatewayAuthError";
  }
}

/** Error raised when a CAP negotiation with a provider fails. */
export class GatewayCapError extends AppError {
  readonly code = "GATEWAY_CAP_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("UNAVAILABLE", 502, message, opts);
    this.name = "GatewayCapError";
  }
}

/** Error raised when the gateway config is missing required values. */
export class GatewayConfigError extends AppError {
  readonly code = "GATEWAY_CONFIG_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
    this.name = "GatewayConfigError";
  }
}

/** Error raised when a resource is not found. */
export class GatewayNotFoundError extends AppError {
  readonly code = "GATEWAY_NOT_FOUND" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, message, opts);
    this.name = "GatewayNotFoundError";
  }
}

/** Error raised when the request is rate-limited. */
export class GatewayRateLimitError extends AppError {
  readonly code = "GATEWAY_RATE_LIMITED" as const;
  constructor(message = "Rate limit exceeded", opts?: AppErrorOptions) {
    super("RATE_LIMITED", 429, message, opts);
    this.name = "GatewayRateLimitError";
  }
}

/** Narrow an unknown thrown value into one of the gateway error types. */
export function isGatewayError(
  value: unknown
): value is
  | GatewayRequestError
  | GatewayUpstreamError
  | GatewayAuthError
  | GatewayCapError
  | GatewayConfigError
  | GatewayNotFoundError
  | GatewayRateLimitError {
  return (
    value instanceof GatewayRequestError ||
    value instanceof GatewayUpstreamError ||
    value instanceof GatewayAuthError ||
    value instanceof GatewayCapError ||
    value instanceof GatewayConfigError ||
    value instanceof GatewayNotFoundError ||
    value instanceof GatewayRateLimitError
  );
}
