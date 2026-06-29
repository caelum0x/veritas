// Fixed-capacity ring buffer that records HealthSnapshot history for trend analysis.
import type { HealthSnapshot, HealthHistoryEntry } from "./types.js";
import { HealthHistoryCapacityError } from "./errors.js";

/** Port: append-only history log with bounded capacity for health snapshots. */
export interface HealthHistory {
  record(snapshot: HealthSnapshot): void;
  entries(): readonly HealthHistoryEntry[];
  latest(): HealthHistoryEntry | null;
  size(): number;
  capacity(): number;
  clear(): void;
}

/** Creates a ring-buffer-backed health history with the given max capacity. */
export function createHealthHistory(maxCapacity: number): HealthHistory {
  if (maxCapacity < 1) {
    throw new HealthHistoryCapacityError(maxCapacity);
  }

  let buffer: HealthHistoryEntry[] = [];

  return {
    record(snapshot: HealthSnapshot): void {
      const entry: HealthHistoryEntry = {
        snapshot,
        recordedAt: new Date().toISOString(),
      };
      if (buffer.length >= maxCapacity) {
        // Drop oldest entry (ring buffer eviction)
        buffer = [...buffer.slice(1), entry];
      } else {
        buffer = [...buffer, entry];
      }
    },

    entries(): readonly HealthHistoryEntry[] {
      return buffer;
    },

    latest(): HealthHistoryEntry | null {
      return buffer.length > 0 ? (buffer[buffer.length - 1] ?? null) : null;
    },

    size(): number {
      return buffer.length;
    },

    capacity(): number {
      return maxCapacity;
    },

    clear(): void {
      buffer = [];
    },
  };
}
