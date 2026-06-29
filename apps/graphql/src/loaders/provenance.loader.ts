// Provenance dataloader: batch-fetches Provenance records by content hash within a request.
import type { Provenance } from "@veritas/contracts";
import { createLoader } from "../dataloader.js";
import type { DataLoader } from "../dataloader.js";

export type ProvenanceLoader = DataLoader<string, Provenance | null>;

/** Build a per-request DataLoader that batches Provenance lookups by content hash. */
export function createProvenanceLoader(
  batchFn: (keys: readonly string[]) => Promise<(Provenance | null | Error)[]>,
): ProvenanceLoader {
  return createLoader<string, Provenance | null>(batchFn);
}
