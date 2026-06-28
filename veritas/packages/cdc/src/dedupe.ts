// Deduplicates CDC events using content-hash or event-id tracking.
import type { CdcEvent } from "./change-event.js";

export interface DedupeStore {
  /** Returns true if the key has already been seen (and records it) */
  checkAndMark(key: string): Promise<boolean>;
  /** Evict entries older than ttlMs from now */
  evict(ttlMs: number): Promise<void>;
}

interface StoreEntry {
  readonly seenAt: number;
}

/** In-memory dedupe store using a bounded LRU-like map */
export class InMemoryDedupeStore implements DedupeStore {
  private readonly seen = new Map<string, StoreEntry>();
  private readonly maxSize: number;

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;
  }

  async checkAndMark(key: string): Promise<boolean> {
    if (this.seen.has(key)) return true;
    if (this.seen.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = this.seen.keys().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    this.seen.set(key, { seenAt: Date.now() });
    return false;
  }

  async evict(ttlMs: number): Promise<void> {
    const cutoff = Date.now() - ttlMs;
    for (const [key, entry] of this.seen.entries()) {
      if (entry.seenAt < cutoff) {
        this.seen.delete(key);
      }
    }
  }

  get size(): number {
    return this.seen.size;
  }
}

export type DedupeKeyFn = (event: CdcEvent) => string;

/** Default deduplication key: prefer contentHash, fallback to event id */
export const defaultDedupeKey: DedupeKeyFn = (event: CdcEvent): string =>
  event.contentHash ?? event.id;

/** Returns a filter function that drops duplicate events */
export function createDedupe(
  store: DedupeStore,
  keyFn: DedupeKeyFn = defaultDedupeKey,
): (event: CdcEvent) => Promise<boolean> {
  return async (event: CdcEvent): Promise<boolean> => {
    const key = keyFn(event);
    const alreadySeen = await store.checkAndMark(key);
    return !alreadySeen;
  };
}

/** Filter an array of events, returning only unseen ones */
export async function dedupeEvents(
  events: readonly CdcEvent[],
  store: DedupeStore,
  keyFn: DedupeKeyFn = defaultDedupeKey,
): Promise<readonly CdcEvent[]> {
  const isNew = createDedupe(store, keyFn);
  const results: CdcEvent[] = [];
  for (const event of events) {
    if (await isNew(event)) {
      results.push(event);
    }
  }
  return results;
}
