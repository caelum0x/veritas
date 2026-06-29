// Negotiation dataloader: batch-fetches Negotiation records by ID to avoid N+1 queries.
import type { Negotiation } from "@veritas/contracts";
import { createLoader } from "../dataloader.js";
import type { DataLoader } from "../dataloader.js";

export type NegotiationLoader = DataLoader<string, Negotiation | null>;

/** Build a per-request DataLoader that batches Negotiation lookups by ID. */
export function createNegotiationLoader(
  batchFn: (keys: readonly string[]) => Promise<(Negotiation | null | Error)[]>,
): NegotiationLoader {
  return createLoader<string, Negotiation | null>(batchFn);
}
