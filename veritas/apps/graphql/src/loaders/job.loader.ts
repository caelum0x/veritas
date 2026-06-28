// Job dataloader: batch-fetches Job records by ID to avoid N+1 queries.
import type { Job } from "@veritas/contracts";
import { createLoader } from "../dataloader.js";
import type { DataLoader } from "../dataloader.js";

export type JobLoader = DataLoader<string, Job | null>;

/** Build a per-request DataLoader that batches Job lookups by ID. */
export function createJobLoader(
  batchFn: (keys: readonly string[]) => Promise<(Job | null | Error)[]>,
): JobLoader {
  return createLoader<string, Job | null>(batchFn);
}
