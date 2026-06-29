// Tickable clock abstraction for scheduler — supports real-time and simulated time
import { Clock, systemClock, epochToIso, type IsoTimestamp } from "@veritas/core";

export interface TickableClock extends Clock {
  /** Advance simulated time by the given milliseconds (no-op for real clocks). */
  tick(ms: number): void;
}

class RealTickableClock implements TickableClock {
  now(): number {
    return systemClock.now();
  }
  nowIso(): IsoTimestamp {
    return epochToIso(systemClock.now());
  }
  tick(_ms: number): void {
    // no-op: real clock advances on its own
  }
}

class SimulatedClock implements TickableClock {
  private current: number;

  constructor(startMs: number) {
    this.current = startMs;
  }

  now(): number {
    return this.current;
  }

  nowIso(): IsoTimestamp {
    return epochToIso(this.current);
  }

  tick(ms: number): void {
    if (ms < 0) throw new RangeError("tick ms must be non-negative");
    this.current = this.current + ms;
  }
}

/** Returns a tickable wrapper around the system clock. */
export function realTickableClock(): TickableClock {
  return new RealTickableClock();
}

/** Returns a simulated clock starting at the given epoch ms (defaults to now). */
export function simulatedClock(startMs?: number): TickableClock {
  return new SimulatedClock(startMs ?? systemClock.now());
}
