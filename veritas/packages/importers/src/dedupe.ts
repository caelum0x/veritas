// dedupe.ts: content-hash-based deduplication of imported RawItems.

import { sha256Hex } from "@veritas/core";
import type { RawItem } from "./importer.js";
import type { DedupeRecord } from "./types.js";

/** Port for dedupe persistence — swap in-memory for DB adapter. */
export interface DedupeStore {
  has(hash: string): boolean;
  record(entry: DedupeRecord): void;
  size(): number;
  clear(): void;
}

/** Create a lightweight in-memory DedupeStore. */
export function createInMemoryDedupeStore(): DedupeStore {
  const seen = new Map<string, DedupeRecord>();
  return {
    has: (hash) => seen.has(hash),
    record: (entry) => { seen.set(entry.contentHash, entry); },
    size: () => seen.size,
    clear: () => { seen.clear(); },
  };
}

/** Compute a stable content hash for a RawItem. */
export function hashRawItem(item: RawItem): string {
  const canonical = JSON.stringify({
    url: item.url.trim().toLowerCase(),
    title: item.title ?? "",
    excerpt: item.excerpt ?? "",
  });
  return sha256Hex(Buffer.from(canonical, "utf8"));
}

/** Result of a dedupe check. */
export interface DedupeResult {
  readonly isDuplicate: boolean;
  readonly hash: string;
}

/**
 * Check whether an item is a duplicate.
 * If not, record it in the store so future calls detect it.
 */
export function checkAndRecord(store: DedupeStore, item: RawItem): DedupeResult {
  const hash = hashRawItem(item);
  if (store.has(hash)) {
    return { isDuplicate: true, hash };
  }
  store.record({ contentHash: hash, url: item.url, seenAt: new Date().toISOString() });
  return { isDuplicate: false, hash };
}

/** Filter a list of RawItems, returning only the unique ones and recording them. */
export function dedupeItems(
  store: DedupeStore,
  items: readonly RawItem[],
): { unique: readonly RawItem[]; duplicateCount: number } {
  const unique: RawItem[] = [];
  let duplicateCount = 0;

  for (const item of items) {
    const { isDuplicate } = checkAndRecord(store, item);
    if (isDuplicate) {
      duplicateCount++;
    } else {
      unique.push(item);
    }
  }

  return { unique, duplicateCount };
}
