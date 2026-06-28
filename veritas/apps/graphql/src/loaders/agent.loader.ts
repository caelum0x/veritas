// Agent dataloader: batch-fetches Agent records by ID to avoid N+1 queries.
import type { Agent } from "@veritas/contracts";
import { createLoader } from "../dataloader.js";
import type { DataLoader } from "../dataloader.js";

export type AgentLoader = DataLoader<string, Agent | null>;

/** Build a per-request DataLoader that batches Agent lookups by ID. */
export function createAgentLoader(
  batchFn: (keys: readonly string[]) => Promise<(Agent | null | Error)[]>,
): AgentLoader {
  return createLoader<string, Agent | null>(batchFn);
}
