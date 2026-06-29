// Application-level error codes and HTTP status mapping for the ops-api.
import { AppError } from "@veritas/core";

/** Map domain error codes to HTTP status codes. */
export const ERROR_STATUS_MAP: Readonly<Record<string, number>> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
  // Incident-specific
  INCIDENT_NOT_FOUND: 404,
  INVALID_STATUS_TRANSITION: 422,
  INCIDENT_ALREADY_CLOSED: 409,
  DUPLICATE_POSTMORTEM: 409,
  // SLO-specific
  SLO_NOT_FOUND: 404,
  SLO_EVALUATION_ERROR: 500,
  // Cost-specific
  BUDGET_NOT_FOUND: 404,
  BUDGET_EXCEEDED: 422,
  ALLOCATION_NOT_FOUND: 404,
  // Capacity-specific
  CAPACITY_MODEL_ERROR: 422,
  INSUFFICIENT_DATA: 422,
  FORECAST_ERROR: 500,
  SATURATION_ERROR: 500,
  RECOMMENDATION_ERROR: 500,
};

export function httpStatusFor(code: string): number {
  return ERROR_STATUS_MAP[code] ?? 500;
}

export function isNotFoundCode(code: string): boolean {
  return code.endsWith("_NOT_FOUND") || code === "NOT_FOUND";
}
