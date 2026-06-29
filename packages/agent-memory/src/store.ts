// Memory store port — abstract interface for persisting and querying agent memories.

import type { Result, Page, PageRequest } from "@veritas/core";
import type { Memory, CreateMemory } from "./memory.js";

export interface MemoryFilter {
  readonly agentId?: string;
  readonly kind?: Memory["kind"];
  readonly sessionId?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly minImportance?: number;
  readonly since?: string;
  readonly until?: string;
  readonly excludeExpired?: boolean;
}

export interface MemoryStore {
  save(memory: CreateMemory & Pick<Memory, "id" | "createdAt" | "updatedAt">): Promise<Result<Memory>>;
  get(id: string): Promise<Result<Memory | undefined>>;
  update(id: string, patch: Partial<Omit<Memory, "id" | "agentId" | "createdAt">>): Promise<Result<Memory>>;
  delete(id: string): Promise<Result<void>>;
  list(filter: MemoryFilter, page: PageRequest): Promise<Result<Page<Memory>>>;
  findByIds(ids: ReadonlyArray<string>): Promise<Result<ReadonlyArray<Memory>>>;
  clear(agentId: string): Promise<Result<number>>;
}

export class InMemoryMemoryStore implements MemoryStore {
  private readonly records = new Map<string, Memory>();

  async save(memory: CreateMemory & Pick<Memory, "id" | "createdAt" | "updatedAt">): Promise<Result<Memory>> {
    const { ok } = await import("@veritas/core");
    const record: Memory = {
      importance: 0.5,
      metadata: {},
      tags: [],
      sourceMemoryIds: [],
      accessCount: 0,
      decayFactor: 1.0,
      ...memory,
    } as Memory;
    this.records.set(record.id, record);
    return ok(record);
  }

  async get(id: string): Promise<Result<Memory | undefined>> {
    const { ok } = await import("@veritas/core");
    return ok(this.records.get(id));
  }

  async update(
    id: string,
    patch: Partial<Omit<Memory, "id" | "agentId" | "createdAt">>
  ): Promise<Result<Memory>> {
    const { ok, err } = await import("@veritas/core");
    const existing = this.records.get(id);
    if (!existing) return err({ code: "NOT_FOUND", message: `Memory ${id} not found` } as never);
    const updated: Memory = { ...existing, ...patch };
    this.records.set(id, updated);
    return ok(updated);
  }

  async delete(id: string): Promise<Result<void>> {
    const { ok } = await import("@veritas/core");
    this.records.delete(id);
    return ok(undefined);
  }

  async list(filter: MemoryFilter, page: PageRequest): Promise<Result<Page<Memory>>> {
    const { ok, makePage } = await import("@veritas/core");
    const now = new Date().toISOString();
    const all = [...this.records.values()].filter((m) => {
      if (filter.agentId && m.agentId !== filter.agentId) return false;
      if (filter.kind && m.kind !== filter.kind) return false;
      if (filter.sessionId && m.sessionId !== filter.sessionId) return false;
      if (filter.tags && filter.tags.length > 0) {
        if (!filter.tags.some((t) => m.tags.includes(t))) return false;
      }
      if (filter.minImportance !== undefined && m.importance < filter.minImportance) return false;
      if (filter.since && m.createdAt < filter.since) return false;
      if (filter.until && m.createdAt > filter.until) return false;
      if (filter.excludeExpired && m.expiresAt && m.expiresAt < now) return false;
      return true;
    });
    const offset = page.cursor ? parseInt(page.cursor, 10) : 0;
    const limit = page.limit ?? 20;
    const slice = all.slice(offset, offset + limit);
    const nextCursor = offset + limit < all.length ? String(offset + limit) : undefined;
    return ok(makePage(slice, nextCursor ?? null));
  }

  async findByIds(ids: ReadonlyArray<string>): Promise<Result<ReadonlyArray<Memory>>> {
    const { ok } = await import("@veritas/core");
    const found = ids.flatMap((id) => {
      const m = this.records.get(id);
      return m ? [m] : [];
    });
    return ok(found);
  }

  async clear(agentId: string): Promise<Result<number>> {
    const { ok } = await import("@veritas/core");
    let count = 0;
    for (const [id, m] of this.records) {
      if (m.agentId === agentId) {
        this.records.delete(id);
        count++;
      }
    }
    return ok(count);
  }
}
