// Verdict dataloader: batches and caches VerdictRecord fetches by ID within a request.
import type { VerdictRecord } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches verdict lookups by ID. */
export function createVerdictLoader(
  batchFn: BatchLoadFn<string, VerdictRecord | null>,
): DataLoader<string, VerdictRecord | null> {
  return new DataLoader<string, VerdictRecord | null>(batchFn);
}

export type VerdictLoader = DataLoader<string, VerdictRecord | null>;
