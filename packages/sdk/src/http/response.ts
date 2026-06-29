// Parses RawResponse into typed API payloads or SdkHttpError on failure.
import { ok, err } from "@veritas/core";
import type { Result, ApiResponse } from "@veritas/core";
import type { RawResponse } from "./transport.js";
import { SdkHttpError, statusToCode } from "./errors.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractRequestId(raw: RawResponse): string | undefined {
  return raw.headers["x-request-id"];
}

function extractRetryAfterMs(raw: RawResponse): number | undefined {
  const header = raw.headers["retry-after"];
  if (!header) return undefined;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? undefined : seconds * 1000;
}

/** Parse a RawResponse envelope into the typed data payload T. */
export function parseResponse<T>(raw: RawResponse): Result<T, SdkHttpError> {
  const { body, status } = raw;

  if (status === 204 || body === null || body === undefined) {
    return ok(undefined as unknown as T);
  }

  if (!isRecord(body)) {
    return err(
      new SdkHttpError({
        message: "Unexpected non-object response body",
        code: "unknown",
        status,
        requestId: extractRequestId(raw),
      }),
    );
  }

  const apiBody = body as unknown as ApiResponse<T>;

  if ("success" in apiBody && apiBody.success === false) {
    const failure = apiBody as { success: false; error: { message: string; code?: string } };
    const msg = isRecord(failure.error) ? String(failure.error.message ?? "Request failed") : "Request failed";
    return err(
      new SdkHttpError({
        message: msg,
        code: statusToCode(status),
        status,
        requestId: extractRequestId(raw),
        retryAfterMs: extractRetryAfterMs(raw),
      }),
    );
  }

  if ("success" in apiBody && apiBody.success === true) {
    const success = apiBody as { success: true; data: T };
    return ok(success.data);
  }

  // Bare object (no envelope) — return as-is
  return ok(body as unknown as T);
}

/** Parse a paginated RawResponse, returning { data, meta }. */
export function parsePageResponse<T>(
  raw: RawResponse,
): Result<{ data: T[]; meta: { total: number; page: number; limit: number; nextCursor?: string; prevCursor?: string } }, SdkHttpError> {
  const { body, status } = raw;

  if (!isRecord(body)) {
    return err(
      new SdkHttpError({
        message: "Expected paginated response body",
        code: "unknown",
        status,
        requestId: extractRequestId(raw),
      }),
    );
  }

  if ("success" in body && body["success"] === false) {
    const failure = body as { success: false; error: { message: string } };
    const msg = isRecord(failure.error) ? String(failure.error.message ?? "Request failed") : "Request failed";
    return err(
      new SdkHttpError({
        message: msg,
        code: statusToCode(status),
        status,
        requestId: extractRequestId(raw),
      }),
    );
  }

  const data = Array.isArray(body["data"]) ? (body["data"] as T[]) : [];
  const meta = isRecord(body["meta"])
    ? (body["meta"] as { total: number; page: number; limit: number; nextCursor?: string; prevCursor?: string })
    : { total: data.length, page: 1, limit: data.length };

  return ok({ data, meta });
}
