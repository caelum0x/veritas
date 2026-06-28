// Reputation link: associate source records with reputation scores and expose combined views.

import { type Result, ok, err, NotFoundError, type SourceId, type Score, clampScore } from "@veritas/core";
import { type Source } from "@veritas/contracts";
import { type SourceRegistry } from "./registry.js";

export interface ReputationEntry {
  readonly sourceId: SourceId;
  readonly score: Score;
  readonly bias: number;          // -1.0 (far left) to 1.0 (far right)
  readonly factualRating: string; // e.g. "HIGH", "MIXED", "LOW"
  readonly recordedAt: string;
}

export interface SourceWithReputation {
  readonly source: Source;
  readonly reputation: ReputationEntry | null;
}

export interface ReputationStore {
  upsert(entry: ReputationEntry): void;
  get(id: SourceId): ReputationEntry | null;
  delete(id: SourceId): void;
}

export function createInMemoryReputationStore(): ReputationStore {
  const map = new Map<string, ReputationEntry>();

  function upsert(entry: ReputationEntry): void {
    map.set(entry.sourceId, entry);
  }

  function get(id: SourceId): ReputationEntry | null {
    return map.get(id) ?? null;
  }

  function deleteEntry(id: SourceId): void {
    map.delete(id);
  }

  return { upsert, get, delete: deleteEntry };
}

export interface ReputationLink {
  link(sourceId: SourceId, entry: Omit<ReputationEntry, "sourceId">): Result<ReputationEntry>;
  unlink(sourceId: SourceId): Result<void>;
  resolve(sourceId: SourceId): Result<SourceWithReputation>;
  resolveAll(): readonly SourceWithReputation[];
  getReputation(sourceId: SourceId): ReputationEntry | null;
}

export function createReputationLink(
  registry: SourceRegistry,
  store: ReputationStore
): ReputationLink {
  function link(
    sourceId: SourceId,
    entry: Omit<ReputationEntry, "sourceId">
  ): Result<ReputationEntry> {
    const sourceResult = registry.findById(sourceId);
    if (!sourceResult.ok) return err(sourceResult.error);

    const rep: ReputationEntry = {
      sourceId,
      score: clampScore(entry.score),
      bias: Math.max(-1, Math.min(1, entry.bias)),
      factualRating: entry.factualRating,
      recordedAt: entry.recordedAt,
    };
    store.upsert(rep);
    return ok(rep);
  }

  function unlink(sourceId: SourceId): Result<void> {
    const rep = store.get(sourceId);
    if (!rep) {
      return err(new NotFoundError({ message: `No reputation entry found for source: ${sourceId}` }));
    }
    store.delete(sourceId);
    return ok(undefined);
  }

  function resolve(sourceId: SourceId): Result<SourceWithReputation> {
    const sourceResult = registry.findById(sourceId);
    if (!sourceResult.ok) return err(sourceResult.error);
    return ok({
      source: sourceResult.value,
      reputation: store.get(sourceId),
    });
  }

  function resolveAll(): readonly SourceWithReputation[] {
    return registry.list().map((source) => ({
      source,
      reputation: store.get(source.id as SourceId),
    }));
  }

  function getReputation(sourceId: SourceId): ReputationEntry | null {
    return store.get(sourceId);
  }

  return { link, unlink, resolve, resolveAll, getReputation };
}
