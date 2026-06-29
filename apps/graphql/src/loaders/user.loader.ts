// User dataloader: batches and caches user fetches by ID within a request.

import type { User } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches user lookups by ID. */
export function createUserLoader(
  batchFn: BatchLoadFn<string, User | null>,
): DataLoader<string, User | null> {
  return new DataLoader<string, User | null>(batchFn);
}

export type UserLoader = DataLoader<string, User | null>;
