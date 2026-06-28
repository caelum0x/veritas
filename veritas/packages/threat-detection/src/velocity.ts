// Velocity checks — detect abnormally high request rates per entity.

import type { ThreatContext } from "./types.js";

export interface VelocityWindow {
  readonly windowMs: number;
  readonly maxCount: number;
  readonly label: string;
  readonly weight: number; // risk score contribution when breached
}

export interface VelocityResult {
  readonly breached: boolean;
  readonly breachedWindows: readonly string[];
  readonly signals: ReadonlyArray<{ readonly label: string; readonly weight: number }>;
}

interface BucketEntry {
  readonly timestamps: number[];
}

type BucketStore = Map<string, BucketEntry>;

function bucketKey(ctx: ThreatContext): string {
  return `${ctx.userId ?? "anon"}:${ctx.ip ?? "unknown"}`;
}

function pruneTimestamps(ts: number[], windowMs: number, now: number): number[] {
  return ts.filter((t) => now - t < windowMs);
}

export interface VelocityChecker {
  check(ctx: ThreatContext): VelocityResult;
  record(ctx: ThreatContext): void;
}

export const DEFAULT_WINDOWS: readonly VelocityWindow[] = Object.freeze([
  { windowMs: 1_000, maxCount: 10, label: "VELOCITY_1S", weight: 50 },
  { windowMs: 60_000, maxCount: 120, label: "VELOCITY_1M", weight: 35 },
  { windowMs: 3_600_000, maxCount: 1_000, label: "VELOCITY_1H", weight: 20 },
]);

export function createVelocityChecker(
  windows: readonly VelocityWindow[] = DEFAULT_WINDOWS
): VelocityChecker {
  const store: BucketStore = new Map();

  function getOrCreate(key: string): BucketEntry {
    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }
    return entry;
  }

  return {
    record(ctx: ThreatContext): void {
      const key = bucketKey(ctx);
      const entry = getOrCreate(key);
      const now = ctx.timestamp;
      const maxWindow = Math.max(...windows.map((w) => w.windowMs));
      const pruned = pruneTimestamps(entry.timestamps, maxWindow, now);
      pruned.push(now);
      store.set(key, { timestamps: pruned });
    },

    check(ctx: ThreatContext): VelocityResult {
      const key = bucketKey(ctx);
      const entry = store.get(key);
      if (!entry) {
        return Object.freeze({ breached: false, breachedWindows: [], signals: [] });
      }
      const now = ctx.timestamp;
      const breachedWindows: string[] = [];
      const signals: Array<{ label: string; weight: number }> = [];

      for (const w of windows) {
        const count = entry.timestamps.filter((t) => now - t < w.windowMs).length;
        if (count >= w.maxCount) {
          breachedWindows.push(w.label);
          signals.push(Object.freeze({ label: w.label, weight: w.weight }));
        }
      }

      return Object.freeze({
        breached: breachedWindows.length > 0,
        breachedWindows: Object.freeze(breachedWindows),
        signals: Object.freeze(signals),
      });
    },
  };
}
