// Service dataloader: batch-fetches Service records by ID to avoid N+1 queries.
import type { Service } from "@veritas/contracts";
import { createLoader } from "../dataloader.js";
import type { DataLoader } from "../dataloader.js";

export type ServiceLoader = DataLoader<string, Service | null>;

/** Build a per-request DataLoader that batches Service lookups by ID. */
export function createServiceLoader(
  batchFn: (keys: readonly string[]) => Promise<(Service | null | Error)[]>,
): ServiceLoader {
  return createLoader<string, Service | null>(batchFn);
}
