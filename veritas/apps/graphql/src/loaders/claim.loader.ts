// Claim dataloader: batches and caches claim fetches by ID within a request.

import type { Claim } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches claim lookups by ID. */
export function createClaimLoader(
  batchFn: BatchLoadFn<string, Claim | null>,
): DataLoader<string, Claim | null> {
  return new DataLoader<string, Claim | null>(batchFn);
}

export type ClaimLoader = DataLoader<string, Claim | null>;
