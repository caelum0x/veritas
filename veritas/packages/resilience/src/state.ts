// Circuit-breaker state machine: CLOSED → OPEN → HALF_OPEN → CLOSED.

export type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface BreakerStateData {
  readonly state: BreakerState;
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureAt: number | null;
  readonly openedAt: number | null;
}

export const initialBreakerState: BreakerStateData = {
  state: "CLOSED",
  failureCount: 0,
  successCount: 0,
  lastFailureAt: null,
  openedAt: null,
};

export function recordFailure(
  data: BreakerStateData,
  threshold: number,
  now: number
): BreakerStateData {
  const failureCount = data.failureCount + 1;
  if (failureCount >= threshold && data.state === "CLOSED") {
    return { ...data, failureCount, lastFailureAt: now, state: "OPEN", openedAt: now };
  }
  return { ...data, failureCount, lastFailureAt: now };
}

export function recordSuccess(data: BreakerStateData, successThreshold: number): BreakerStateData {
  if (data.state === "HALF_OPEN") {
    const successCount = data.successCount + 1;
    if (successCount >= successThreshold) {
      return { ...initialBreakerState };
    }
    return { ...data, successCount };
  }
  return { ...data, failureCount: 0, successCount: 0 };
}

export function maybeTransitionToHalfOpen(
  data: BreakerStateData,
  resetTimeoutMs: number,
  now: number
): BreakerStateData {
  if (
    data.state === "OPEN" &&
    data.openedAt !== null &&
    now - data.openedAt >= resetTimeoutMs
  ) {
    return { ...data, state: "HALF_OPEN", successCount: 0 };
  }
  return data;
}
