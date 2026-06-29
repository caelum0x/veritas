// Rate-limit filter: enforces per-key limits using the @veritas/ratelimit package.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export interface RateLimitPolicy {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly keyPrefix: string;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
  readonly limit: number;
}

export type RateLimitCheck = (
  key: string,
  policy: RateLimitPolicy,
) => Promise<RateLimitResult>;

export interface RateFilterConfig {
  readonly policy: RateLimitPolicy;
  readonly keyExtractor: (headers: Readonly<Record<string, string>>, subject: string | null) => string;
}

export function subjectKeyExtractor(
  headers: Readonly<Record<string, string>>,
  subject: string | null,
): string {
  return subject ?? headers["x-forwarded-for"] ?? headers["x-real-ip"] ?? "anonymous";
}

export function ipKeyExtractor(
  headers: Readonly<Record<string, string>>,
  _subject: string | null,
): string {
  return headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? headers["x-real-ip"] ?? "unknown";
}

export async function runRateFilter(
  headers: Readonly<Record<string, string>>,
  subject: string | null,
  config: RateFilterConfig,
  check: RateLimitCheck,
): Promise<Result<RateLimitResult, string>> {
  const rawKey = config.keyExtractor(headers, subject);
  const key = `${config.policy.keyPrefix}:${rawKey}`;
  const result = await check(key, config.policy);
  if (!result.allowed) {
    return err(
      `Rate limit exceeded. Retry after ${new Date(result.resetAt).toISOString()}`,
    );
  }
  return ok(result);
}

export function rateLimitHeaders(result: RateLimitResult): Readonly<Record<string, string>> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
