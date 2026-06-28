// Working memory — ephemeral short-term context held during active agent reasoning.

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export interface WorkingMemoryEntry {
  readonly key: string;
  readonly value: unknown;
  readonly ttlMs?: number;
  readonly storedAt: number;
}

export interface WorkingMemorySnapshot {
  readonly agentId: string;
  readonly sessionId: string;
  readonly entries: Readonly<Record<string, WorkingMemoryEntry>>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export class WorkingMemory {
  private readonly entries = new Map<string, WorkingMemoryEntry>();
  private readonly agentId: string;
  private readonly sessionId: string;
  private readonly createdAt: number;
  private capacity: number;

  constructor(agentId: string, sessionId: string, capacity = 128) {
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.createdAt = Date.now();
    this.capacity = capacity;
  }

  set(key: string, value: unknown, ttlMs?: number): Result<void> {
    if (this.entries.size >= this.capacity && !this.entries.has(key)) {
      return err({ code: "CAPACITY_EXCEEDED", message: `Working memory capacity (${this.capacity}) reached` } as never);
    }
    this.entries.set(key, { key, value, ttlMs, storedAt: Date.now() });
    return ok(undefined);
  }

  get<T = unknown>(key: string): Result<T | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return ok(undefined);

    if (entry.ttlMs !== undefined && Date.now() - entry.storedAt > entry.ttlMs) {
      this.entries.delete(key);
      return ok(undefined);
    }

    return ok(entry.value as T);
  }

  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (entry.ttlMs !== undefined && Date.now() - entry.storedAt > entry.ttlMs) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): Result<void> {
    this.entries.delete(key);
    return ok(undefined);
  }

  keys(): ReadonlyArray<string> {
    this.evictExpired();
    return [...this.entries.keys()];
  }

  size(): number {
    this.evictExpired();
    return this.entries.size;
  }

  snapshot(): WorkingMemorySnapshot {
    this.evictExpired();
    const entries: Record<string, WorkingMemoryEntry> = {};
    for (const [k, v] of this.entries) {
      entries[k] = v;
    }
    return {
      agentId: this.agentId,
      sessionId: this.sessionId,
      entries: Object.freeze(entries),
      createdAt: this.createdAt,
      updatedAt: Date.now(),
    };
  }

  clear(): Result<void> {
    this.entries.clear();
    return ok(undefined);
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.ttlMs !== undefined && now - entry.storedAt > entry.ttlMs) {
        this.entries.delete(key);
      }
    }
  }
}
