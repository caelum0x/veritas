// Order dataloader: batches and caches order fetches by ID within a request.

import type { Order } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches order lookups by ID. */
export function createOrderLoader(
  batchFn: BatchLoadFn<string, Order | null>,
): DataLoader<string, Order | null> {
  return new DataLoader<string, Order | null>(batchFn);
}

export type OrderLoader = DataLoader<string, Order | null>;
