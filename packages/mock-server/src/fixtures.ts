// Provides pre-built response fixture builders for common Veritas domain objects.
import type { MockResponse } from "./mock.js";

function jsonResponse(body: unknown, status = 200, extra: Partial<MockResponse> = {}): MockResponse {
  return {
    status,
    headers: { "content-type": "application/json", ...extra.headers },
    body,
    delay: extra.delay ?? 0,
  };
}

export function fixtureOk(body: unknown = null): MockResponse {
  return jsonResponse({ success: true, data: body, error: null });
}

export function fixtureCreated(body: unknown = null): MockResponse {
  return jsonResponse({ success: true, data: body, error: null }, 201);
}

export function fixtureNotFound(message = "Resource not found"): MockResponse {
  return jsonResponse({ success: false, data: null, error: { code: "NOT_FOUND", message } }, 404);
}

export function fixtureBadRequest(message = "Bad request", fields: unknown[] = []): MockResponse {
  return jsonResponse(
    { success: false, data: null, error: { code: "VALIDATION_ERROR", message, fields } },
    400,
  );
}

export function fixtureUnauthorized(message = "Unauthorized"): MockResponse {
  return jsonResponse({ success: false, data: null, error: { code: "UNAUTHORIZED", message } }, 401);
}

export function fixtureForbidden(message = "Forbidden"): MockResponse {
  return jsonResponse({ success: false, data: null, error: { code: "FORBIDDEN", message } }, 403);
}

export function fixtureConflict(message = "Conflict"): MockResponse {
  return jsonResponse({ success: false, data: null, error: { code: "CONFLICT", message } }, 409);
}

export function fixtureRateLimit(retryAfterSecs = 60): MockResponse {
  return jsonResponse(
    { success: false, data: null, error: { code: "RATE_LIMITED", message: "Too many requests" } },
    429,
    { headers: { "retry-after": String(retryAfterSecs) } },
  );
}

export function fixtureInternalError(message = "Internal server error"): MockResponse {
  return jsonResponse(
    { success: false, data: null, error: { code: "INTERNAL_ERROR", message } },
    500,
  );
}

export function fixtureEmpty(): MockResponse {
  return { status: 204, headers: {}, body: undefined, delay: 0 };
}

export function fixturePage<T>(items: readonly T[], total: number, page = 1, limit = 20): MockResponse {
  return jsonResponse({
    success: true,
    data: items,
    error: null,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
