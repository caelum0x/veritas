// Tenant dataloader: batches and caches tenant (Organization) fetches by ID within a request.

import type { Organization } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches tenant lookups by ID. */
export function createTenantLoader(
  batchFn: BatchLoadFn<string, Organization | null>,
): DataLoader<string, Organization | null> {
  return new DataLoader<string, Organization | null>(batchFn);
}

export type TenantLoader = DataLoader<string, Organization | null>;
