// In-memory replay protection store to prevent duplicate webhook deliveries.

import { Result, ok, err } from "@veritas/core";
import { ReplayDetectedError } from "./errors.js";

export interface ReplayStore {
  seen(deliveryId: string): Promise<boolean>;
  record(deliveryId: string, expiresAt: number): Promise<void>;
}

/** In-memory replay store with TTL-based expiry. */
export class InMemoryReplayStore implements ReplayStore {
  private readonly seen_ids = new Map<string, number>();

  async seen(deliveryId: string): Promise<boolean> {
    const exp = this.seen_ids.get(deliveryId);
    if (exp === undefined) return false;
    if (Date.now() > exp) {
      this.seen_ids.delete(deliveryId);
      return false;
    }
    return true;
  }

  async record(deliveryId: string, expiresAt: number): Promise<void> {
    this.seen_ids.set(deliveryId, expiresAt);
    // Evict expired entries periodically to bound memory usage.
    if (this.seen_ids.size > 10_000) {
      const now = Date.now();
      for (const [id, exp] of this.seen_ids) {
        if (now > exp) this.seen_ids.delete(id);
      }
    }
  }
}

export class ReplayGuard {
  private readonly store: ReplayStore;
  private readonly windowMs: number;

  constructor(store: ReplayStore, windowMs: number) {
    this.store = store;
    this.windowMs = windowMs;
  }

  async check(deliveryId: string): Promise<Result<void, ReplayDetectedError>> {
    const alreadySeen = await this.store.seen(deliveryId);
    if (alreadySeen) return err(new ReplayDetectedError(deliveryId));
    await this.store.record(deliveryId, Date.now() + this.windowMs);
    return ok(undefined);
  }
}

export function createReplayGuard(windowMs: number): ReplayGuard {
  return new ReplayGuard(new InMemoryReplayStore(), windowMs);
}
