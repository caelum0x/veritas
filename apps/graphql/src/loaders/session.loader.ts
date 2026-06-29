// Session dataloader: batches and caches session fetches by ID within a request.

import type { Session } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches session lookups by ID. */
export function createSessionLoader(
  batchFn: BatchLoadFn<string, Session | null>,
): DataLoader<string, Session | null> {
  return new DataLoader<string, Session | null>(batchFn);
}

export type SessionLoader = DataLoader<string, Session | null>;
