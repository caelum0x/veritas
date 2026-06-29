// Settlement dataloader: batches and caches settlement fetches by ID within a request.
import type { Settlement } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches settlement lookups by ID. */
export function createSettlementLoader(
  batchFn: BatchLoadFn<string, Settlement | null>,
): DataLoader<string, Settlement | null> {
  return new DataLoader<string, Settlement | null>(batchFn);
}

export type SettlementLoader = DataLoader<string, Settlement | null>;
