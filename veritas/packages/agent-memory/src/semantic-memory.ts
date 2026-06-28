// Embedding-backed semantic memory — stores and retrieves memories via vector similarity.

import type { Result } from "@veritas/core";
import { ok, err, isOk, newId, epochToIso } from "@veritas/core";
import type { Embedder, VectorStore } from "@veritas/embeddings";
import { toArray } from "@veritas/embeddings";
import type { Memory, CreateMemory } from "./memory.js";
import type { MemoryStore, MemoryFilter } from "./store.js";
import type { PageRequest, Page } from "@veritas/core";

export interface SemanticSearchOptions {
  readonly agentId: string;
  readonly query: string;
  readonly k?: number;
  readonly minScore?: number;
  readonly filter?: Omit<MemoryFilter, "agentId">;
}

export interface SemanticSearchResult {
  readonly memory: Memory;
  readonly score: number;
}

export class SemanticMemoryStore {
  constructor(
    private readonly store: MemoryStore,
    private readonly embedder: Embedder,
    private readonly vectors: VectorStore,
  ) {}

  async add(input: Omit<CreateMemory, "embedding"> & { agentId: string; content: string }): Promise<Result<Memory>> {
    const embedResult = await this.embedder.embed(input.content);
    if (!isOk(embedResult)) return err(embedResult.error);

    const vector = embedResult.value;
    const now = epochToIso(Date.now());
    const id = newId("mem");

    const memoryToSave = {
      ...input,
      id,
      embedding: [...toArray(vector)] as number[],
      createdAt: now,
      updatedAt: now,
      kind: input.kind ?? ("semantic" as const),
    } as Parameters<MemoryStore["save"]>[0];

    const saveResult = await this.store.save(memoryToSave);
    if (!isOk(saveResult)) return err(saveResult.error);

    const upsertResult = await this.vectors.upsert({
      id,
      vector,
      metadata: { agentId: input.agentId, kind: input.kind ?? "semantic" },
    });
    if (!isOk(upsertResult)) return err(upsertResult.error);

    return ok(saveResult.value);
  }

  async search(options: SemanticSearchOptions): Promise<Result<ReadonlyArray<SemanticSearchResult>>> {
    const embedResult = await this.embedder.embed(options.query);
    if (!isOk(embedResult)) return err(embedResult.error);

    const queryResult = await this.vectors.query({
      vector: embedResult.value,
      k: options.k ?? 10,
      filter: { agentId: options.agentId },
    });
    if (!isOk(queryResult)) return err(queryResult.error);

    const minScore = options.minScore ?? 0.0;
    const candidates = queryResult.value.filter((r) => r.score >= minScore);

    const ids = candidates.map((c) => c.record.id);
    if (ids.length === 0) return ok([]);

    const findResult = await this.store.findByIds(ids);
    if (!isOk(findResult)) return err(findResult.error);

    const scoreMap = new Map(candidates.map((c) => [c.record.id, c.score]));
    const results: SemanticSearchResult[] = findResult.value
      .filter((m) => m.agentId === options.agentId)
      .map((memory) => ({ memory, score: scoreMap.get(memory.id) ?? 0 }))
      .sort((a, b) => b.score - a.score);

    return ok(results);
  }

  async remove(id: string): Promise<Result<void>> {
    const deleteVec = await this.vectors.delete(id);
    if (!isOk(deleteVec)) return err(deleteVec.error);
    return this.store.delete(id);
  }

  async list(filter: MemoryFilter, page: PageRequest): Promise<Result<Page<Memory>>> {
    return this.store.list(filter, page);
  }
}
