// Replay a previously cached idempotency response to the Express response object.
import type { Response } from "express";
import type { IdempotencyResponse } from "./types.js";

export const IDEMPOTENCY_REPLAYED_HEADER = "idempotency-replayed";

/** Write a stored idempotency response back to an Express response. */
export function replayResponse(
  res: Response,
  stored: IdempotencyResponse,
): void {
  for (const [name, value] of Object.entries(stored.headers)) {
    res.setHeader(name, value);
  }
  res.setHeader(IDEMPOTENCY_REPLAYED_HEADER, "true");
  res.status(stored.status).json(stored.body);
}

/** Build an IdempotencyResponse snapshot from Express response parts. */
export function buildStoredResponse(
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): IdempotencyResponse {
  return { status, body, headers };
}

/** Extract response headers from an Express Response that are safe to replay. */
export function extractReplayableHeaders(
  res: Response,
  allowList: readonly string[] = ["content-type", "x-request-id"],
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of allowList) {
    const value = res.getHeader(name);
    if (typeof value === "string") {
      out[name] = value;
    } else if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === "string") out[name] = first;
    }
  }
  return out;
}
