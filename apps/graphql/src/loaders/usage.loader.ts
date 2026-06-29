// Usage dataloader: batches and caches usage record fetches by ID within a request.

import type { Usage } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches usage record lookups by ID. */
export function createUsageLoader(
  batchFn: BatchLoadFn<string, Usage | null>,
): DataLoader<string, Usage | null> {
  return new DataLoader<string, Usage | null>(batchFn);
}

export type UsageLoader = DataLoader<string, Usage | null>;
