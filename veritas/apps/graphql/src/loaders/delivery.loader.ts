// Delivery dataloader: batch-fetches Delivery records by ID to avoid N+1 queries.
import type { Delivery } from "@veritas/contracts";
import { createLoader } from "../dataloader.js";
import type { DataLoader } from "../dataloader.js";

export type DeliveryLoader = DataLoader<string, Delivery | null>;

/** Build a per-request DataLoader that batches Delivery lookups by ID. */
export function createDeliveryLoader(
  batchFn: (keys: readonly string[]) => Promise<(Delivery | null | Error)[]>,
): DeliveryLoader {
  return createLoader<string, Delivery | null>(batchFn);
}
