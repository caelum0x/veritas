// LimitDecision — immutable value object returned from every limiter check.
export interface LimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: number;       // Unix ms when window resets / bucket refills
  readonly retryAfterMs: number;  // 0 when allowed
}

export function allowedDecision(limit: number, remaining: number, resetAt: number): LimitDecision {
  return { allowed: true, limit, remaining, resetAt, retryAfterMs: 0 };
}

export function deniedDecision(limit: number, resetAt: number, now: number): LimitDecision {
  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt,
    retryAfterMs: Math.max(0, resetAt - now),
  };
}
