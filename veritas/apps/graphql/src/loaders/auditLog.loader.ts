// AuditLog dataloader: batches and caches audit log fetches by ID within a request.
import type { AuditLog } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches audit log lookups by ID. */
export function createAuditLogLoader(
  batchFn: BatchLoadFn<string, AuditLog | null>,
): DataLoader<string, AuditLog | null> {
  return new DataLoader<string, AuditLog | null>(batchFn);
}

export type AuditLogLoader = DataLoader<string, AuditLog | null>;
