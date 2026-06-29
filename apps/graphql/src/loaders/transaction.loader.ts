// Transaction dataloader: batches and caches transaction fetches by ID within a request.
import type { Transaction } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches transaction lookups by ID. */
export function createTransactionLoader(
  batchFn: BatchLoadFn<string, Transaction | null>,
): DataLoader<string, Transaction | null> {
  return new DataLoader<string, Transaction | null>(batchFn);
}

export type TransactionLoader = DataLoader<string, Transaction | null>;
