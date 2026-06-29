// RateLimit response headers — builds standard draft-ietf-httpapi-ratelimit-headers.
import type { LimitDecision } from "./result.js";

export interface RateLimitHeaders {
  readonly "RateLimit-Limit": string;
  readonly "RateLimit-Remaining": string;
  readonly "RateLimit-Reset": string;
  /** Present only when request was denied. */
  readonly "Retry-After"?: string;
}

/** Build standard rate-limit headers from a LimitDecision. */
export function buildRateLimitHeaders(decision: LimitDecision, nowMs?: number): RateLimitHeaders {
  const now = nowMs ?? Date.now();
  const resetSeconds = Math.ceil(Math.max(0, decision.resetAt - now) / 1000);

  const base: RateLimitHeaders = {
    "RateLimit-Limit": String(decision.limit),
    "RateLimit-Remaining": String(Math.max(0, decision.remaining)),
    "RateLimit-Reset": String(resetSeconds),
  };

  if (!decision.allowed && decision.retryAfterMs > 0) {
    const retrySeconds = Math.ceil(decision.retryAfterMs / 1000);
    return { ...base, "Retry-After": String(retrySeconds) };
  }

  return base;
}

/** Apply rate-limit headers to a Headers-like object (e.g., Fetch API Headers or Node IncomingMessage). */
export function applyRateLimitHeaders(
  headers: { set(name: string, value: string): void },
  decision: LimitDecision,
  nowMs?: number
): void {
  const built = buildRateLimitHeaders(decision, nowMs);
  for (const [name, value] of Object.entries(built)) {
    if (value != null) {
      headers.set(name, value);
    }
  }
}

/** Convert headers object to a plain record (useful for HTTP frameworks). */
export function headersToRecord(headers: RateLimitHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter((entry): entry is [string, string] => entry[1] != null)
  );
}
