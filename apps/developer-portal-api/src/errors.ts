// Application-specific error helpers and HTTP status mappings.
import { isAppError, type ErrorCode } from "@veritas/core";

export const HTTP_STATUS_MAP: Readonly<Record<string, number>> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function appErrorToHttpStatus(code: ErrorCode | string): number {
  return HTTP_STATUS_MAP[code as string] ?? 500;
}

export function isKnownAppError(err: unknown): err is { code: string; message: string } {
  return isAppError(err as Error);
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}
