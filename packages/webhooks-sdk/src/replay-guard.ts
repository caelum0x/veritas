// Replay protection: rejects duplicate webhook events within a configurable time window.

import { epochToIso, type IsoTimestamp } from "@veritas/core";
import { WebhookReplayError } from "./errors.js";
import type { ReplayGuardEntry } from "./types.js";

export interface ReplayGuardOptions {
  /** Seconds before an event ID expires from the seen set. Default: 300. */
  toleranceSecs?: number;
  /** Clock override for testing. Default: Date.now. */
  nowMs?: () => number;
}

/**
 * In-memory replay guard that tracks processed event IDs and rejects duplicates.
 * Not suitable for multi-process deployments without an external store.
 */
export class ReplayGuard {
  private readonly seen = new Map<string, IsoTimestamp>();
  private readonly toleranceMs: number;
  private readonly nowMs: () => number;

  constructor(options: ReplayGuardOptions = {}) {
    this.toleranceMs = (options.toleranceSecs ?? 300) * 1_000;
    this.nowMs = options.nowMs ?? (() => Date.now());
  }

  /**
   * Asserts that the given event ID has not been seen within the tolerance window.
   * Registers it if new. Throws WebhookReplayError on duplicate.
   */
  assert(eventId: string): void {
    this.evict();
    if (this.seen.has(eventId)) {
      throw new WebhookReplayError(eventId);
    }
    this.seen.set(eventId, epochToIso(this.nowMs()));
  }

  /**
   * Returns true if the event ID is new (not a replay); false if it is a duplicate.
   * Does NOT register the event — call `register` separately.
   */
  isNew(eventId: string): boolean {
    this.evict();
    return !this.seen.has(eventId);
  }

  /** Explicitly register an event ID as processed. */
  register(eventId: string): void {
    this.seen.set(eventId, epochToIso(this.nowMs()));
  }

  /** Returns a snapshot of all currently tracked entries. */
  entries(): readonly ReplayGuardEntry[] {
    return Array.from(this.seen.entries()).map(([eventId, processedAt]) => ({
      eventId,
      processedAt,
    }));
  }

  /** Clears all tracked event IDs. */
  clear(): void {
    this.seen.clear();
  }

  /** Removes entries older than the tolerance window. */
  private evict(): void {
    const cutoff = this.nowMs() - this.toleranceMs;
    for (const [id, ts] of this.seen) {
      if (Date.parse(ts) < cutoff) {
        this.seen.delete(id);
      }
    }
  }
}
