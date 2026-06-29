// Memory retrieval — filters and ranks memories by recency, importance, and semantic score.

import { ok, err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { MemoryStore, MemoryFilter } from "./store.js";
import type { Memory } from "./memory.js";
import { effectiveImportance } from "./memory.js";
import type { MemoryKind } from "./memory.js";

export interface RetrievalOptions {
  readonly agentId: string;
  readonly kind?: MemoryKind;
  readonly sessionId?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly minImportance?: number;
  readonly limit?: number;
  readonly since?: string;
  readonly until?: string;
  readonly excludeExpired?: boolean;
  readonly sortBy?: "recency" | "importance" | "access";
}

export interface RetrievalResult {
  readonly memories: ReadonlyArray<Memory>;
  readonly total: number;
}

function sortMemories(memories: ReadonlyArray<Memory>, sortBy: RetrievalOptions["sortBy"]): ReadonlyArray<Memory> {
  const copy = [...memories];
  switch (sortBy) {
    case "importance":
      return copy.sort((a, b) => effectiveImportance(b) - effectiveImportance(a));
    case "access":
      return copy.sort((a, b) => b.accessCount - a.accessCount);
    case "recency":
    default:
      return copy.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }
}

export async function retrieveMemories(
  store: MemoryStore,
  options: RetrievalOptions,
): Promise<Result<RetrievalResult>> {
  const filter: MemoryFilter = {
    agentId: options.agentId,
    kind: options.kind,
    sessionId: options.sessionId,
    tags: options.tags ? [...options.tags] : undefined,
    minImportance: options.minImportance,
    since: options.since,
    until: options.until,
    excludeExpired: options.excludeExpired ?? true,
  };

  const pageRequest = { limit: options.limit ?? 20 };
  const result = await store.list(filter, pageRequest);
  if (!isOk(result)) return err(result.error);

  const sorted = sortMemories(result.value.items, options.sortBy ?? "recency");
  return ok({ memories: sorted, total: sorted.length });
}

export async function retrieveById(
  store: MemoryStore,
  id: string,
): Promise<Result<Memory | undefined>> {
  return store.get(id);
}

export async function retrieveByIds(
  store: MemoryStore,
  ids: ReadonlyArray<string>,
): Promise<Result<ReadonlyArray<Memory>>> {
  return store.findByIds(ids);
}
