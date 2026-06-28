// Episodic memory — ordered log of agent events and interactions within sessions.

import type { Result, Page, PageRequest } from "@veritas/core";
import { ok, err, isOk, newId, epochToIso } from "@veritas/core";
import type { Memory } from "./memory.js";
import type { MemoryStore } from "./store.js";

export interface Episode {
  readonly id: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly content: string;
  readonly role: "agent" | "user" | "system" | "tool";
  readonly importance: number;
  readonly tags: ReadonlyArray<string>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

export interface EpisodeFilter {
  readonly agentId: string;
  readonly sessionId?: string;
  readonly role?: Episode["role"];
  readonly since?: string;
  readonly until?: string;
  readonly tags?: ReadonlyArray<string>;
}

export class EpisodicMemory {
  constructor(private readonly store: MemoryStore) {}

  async record(episode: Omit<Episode, "id" | "timestamp">): Promise<Result<Memory>> {
    const now = epochToIso(Date.now());
    const id = newId("mem");

    return this.store.save({
      id,
      agentId: episode.agentId,
      kind: "episodic",
      content: episode.content,
      sessionId: episode.sessionId,
      importance: episode.importance,
      tags: [...episode.tags],
      metadata: {
        ...episode.metadata,
        role: episode.role,
        episodeTimestamp: now,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  async getSession(
    agentId: string,
    sessionId: string,
    page: PageRequest,
  ): Promise<Result<Page<Memory>>> {
    return this.store.list({ agentId, sessionId, kind: "episodic" }, page);
  }

  async getRecent(
    agentId: string,
    limit: number,
    sessionId?: string,
  ): Promise<Result<ReadonlyArray<Memory>>> {
    const filter = { agentId, kind: "episodic" as const, sessionId };
    const result = await this.store.list(filter, { limit });
    if (!isOk(result)) return err(result.error);
    return ok(result.value.items);
  }

  async summarizeSession(
    agentId: string,
    sessionId: string,
  ): Promise<Result<ReadonlyArray<Memory>>> {
    const result = await this.store.list(
      { agentId, sessionId, kind: "episodic" },
      { limit: 500 },
    );
    if (!isOk(result)) return err(result.error);

    const memories = result.value.items;
    const byImportance = [...memories].sort(
      (a, b) => b.importance * b.decayFactor - a.importance * a.decayFactor,
    );
    return ok(byImportance);
  }

  async clearSession(agentId: string, sessionId: string): Promise<Result<void>> {
    const listResult = await this.store.list(
      { agentId, sessionId, kind: "episodic" },
      { limit: 1000 },
    );
    if (!isOk(listResult)) return err(listResult.error);

    for (const memory of listResult.value.items) {
      const delResult = await this.store.delete(memory.id);
      if (!isOk(delResult)) return err(delResult.error);
    }
    return ok(undefined);
  }
}
