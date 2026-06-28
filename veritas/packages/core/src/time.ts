// Clock abstraction and Instant helpers for testable time access.

import { epochToIso, type IsoTimestamp } from "./iso.js";

/** A source of the current time; inject to make time deterministic in tests. */
export interface Clock {
  /** Current time as epoch milliseconds. */
  now(): number;
  /** Current time as an ISO-8601 timestamp. */
  nowIso(): IsoTimestamp;
}

/** The real wall-clock backed by Date.now(). */
export const systemClock: Clock = {
  now: () => Date.now(),
  nowIso: () => epochToIso(Date.now()),
};

/** A fixed clock that always returns the same instant (useful for tests). */
export function fixedClock(epochMs: number): Clock {
  return {
    now: () => epochMs,
    nowIso: () => epochToIso(epochMs),
  };
}

/** A mutable clock that can be advanced manually. */
export function mutableClock(startMs = 0): Clock & { advance(ms: number): void; set(ms: number): void } {
  let current = startMs;
  return {
    now: () => current,
    nowIso: () => epochToIso(current),
    advance: (ms: number) => {
      current += ms;
    },
    set: (ms: number) => {
      current = ms;
    },
  };
}

/** Milliseconds-per-unit constants for readable durations. */
export const Duration = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
} as const;
