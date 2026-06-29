// Report dataloader: batches and caches Report fetches by ID within a request.
import type { Report } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches report lookups by ID. */
export function createReportLoader(
  batchFn: BatchLoadFn<string, Report | null>,
): DataLoader<string, Report | null> {
  return new DataLoader<string, Report | null>(batchFn);
}

export type ReportLoader = DataLoader<string, Report | null>;
