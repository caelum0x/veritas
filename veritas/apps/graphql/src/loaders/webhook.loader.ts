// Webhook dataloader: batches and caches webhook fetches by ID within a request.
import type { Webhook } from "@veritas/contracts";
import { DataLoader, type BatchLoadFn } from "../dataloader.js";

/** Creates a per-request DataLoader that batches webhook lookups by ID. */
export function createWebhookLoader(
  batchFn: BatchLoadFn<string, Webhook | null>,
): DataLoader<string, Webhook | null> {
  return new DataLoader<string, Webhook | null>(batchFn);
}

export type WebhookLoader = DataLoader<string, Webhook | null>;
