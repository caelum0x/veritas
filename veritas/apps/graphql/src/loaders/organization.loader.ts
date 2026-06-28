// Organization dataloader: batches and caches organization fetches by ID within a request.

import type { Organization } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches organization lookups by ID. */
export function createOrganizationLoader(
  batchFn: BatchLoadFn<string, Organization | null>,
): DataLoader<string, Organization | null> {
  return new DataLoader<string, Organization | null>(batchFn);
}

export type OrganizationLoader = DataLoader<string, Organization | null>;
