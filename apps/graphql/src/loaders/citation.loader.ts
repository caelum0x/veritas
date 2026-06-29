// Citation dataloader: batches and caches citation fetches by ID within a request.
import type { Citation } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches citation lookups by ID. */
export function createCitationLoader(
  batchFn: BatchLoadFn<string, Citation | null>,
): DataLoader<string, Citation | null> {
  return new DataLoader<string, Citation | null>(batchFn);
}

export type CitationLoader = DataLoader<string, Citation | null>;
