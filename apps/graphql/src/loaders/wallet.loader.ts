// Wallet dataloader: batches and caches wallet fetches by ID within a request.

import type { Wallet } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches wallet lookups by ID. */
export function createWalletLoader(
  batchFn: BatchLoadFn<string, Wallet | null>,
): DataLoader<string, Wallet | null> {
  return new DataLoader<string, Wallet | null>(batchFn);
}

export type WalletLoader = DataLoader<string, Wallet | null>;
