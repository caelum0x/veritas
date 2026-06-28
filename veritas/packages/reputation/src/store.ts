// Reputation repository interface and in-memory implementation.

import {
  type Result,
  ok,
  err,
  type IsoTimestamp,
  epochToIso,
  newId,
} from "@veritas/core";
import type {
  ReputationSnapshot,
  ReputationId,
  PersistedReputationEvent,
  ReputationEventFilter,
} from "./types.js";
import {
  ReputationNotFoundError,
  DuplicateReputationEventError,
} from "./errors.js";
import type { PtsScore } from "./pts-score.js";
import { PTS_INITIAL } from "./pts-score.js";

/** Port for reputation snapshot persistence. */
export interface ReputationStore {
  findByAgentId(
    agentId: string,
  ): Promise<Result<ReputationSnapshot, ReputationNotFoundError>>;

  upsert(
    agentId: string,
    score: PtsScore,
    eventCount: number,
    lastEventAt: IsoTimestamp | undefined,
  ): Promise<Result<ReputationSnapshot, never>>;

  listEvents(
    filter: ReputationEventFilter,
  ): Promise<Result<ReadonlyArray<PersistedReputationEvent>, never>>;

  recordEvent(
    event: PersistedReputationEvent,
  ): Promise<Result<PersistedReputationEvent, DuplicateReputationEventError>>;
}

// ── In-memory implementation ──────────────────────────────────────────────────

/** In-memory ReputationStore suitable for tests and local development. */
export class InMemoryReputationStore implements ReputationStore {
  private readonly snapshots = new Map<string, ReputationSnapshot>();
  private readonly events = new Map<string, PersistedReputationEvent>();

  async findByAgentId(
    agentId: string,
  ): Promise<Result<ReputationSnapshot, ReputationNotFoundError>> {
    const snap = this.snapshots.get(agentId);
    if (!snap) {
      return err(new ReputationNotFoundError(agentId));
    }
    return ok(snap);
  }

  async upsert(
    agentId: string,
    score: PtsScore,
    eventCount: number,
    lastEventAt: IsoTimestamp | undefined,
  ): Promise<Result<ReputationSnapshot, never>> {
    const now = epochToIso(Date.now());
    const existing = this.snapshots.get(agentId);
    const snap: ReputationSnapshot = {
      id: existing?.id ?? (newId("rep") as unknown as ReputationId),
      agentId,
      score,
      eventCount,
      lastEventAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.snapshots.set(agentId, snap);
    return ok(snap);
  }

  async listEvents(
    filter: ReputationEventFilter,
  ): Promise<Result<ReadonlyArray<PersistedReputationEvent>, never>> {
    const results: PersistedReputationEvent[] = [];
    for (const ev of this.events.values()) {
      if (ev.agentId !== filter.agentId) continue;
      if (filter.kinds && !filter.kinds.includes(ev.kind)) continue;
      if (filter.since && ev.occurredAt < filter.since) continue;
      if (filter.until && ev.occurredAt > filter.until) continue;
      results.push(ev);
    }
    results.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));
    const limited =
      filter.limit !== undefined ? results.slice(0, filter.limit) : results;
    return ok(limited);
  }

  async recordEvent(
    event: PersistedReputationEvent,
  ): Promise<Result<PersistedReputationEvent, DuplicateReputationEventError>> {
    if (this.events.has(event.id)) {
      return err(new DuplicateReputationEventError(event.id));
    }
    this.events.set(event.id, event);
    return ok(event);
  }

  /** Seed a snapshot directly (test helper). */
  seedSnapshot(snapshot: ReputationSnapshot): void {
    this.snapshots.set(snapshot.agentId, snapshot);
  }

  /** Return total event count (test helper). */
  eventCount(): number {
    return this.events.size;
  }
}

/** Build a fresh snapshot with initial PTS for a new agent. */
export function initialSnapshot(agentId: string): ReputationSnapshot {
  const now = epochToIso(Date.now());
  return {
    id: newId("rep") as unknown as ReputationId,
    agentId,
    score: PTS_INITIAL as unknown as PtsScore,
    eventCount: 0,
    lastEventAt: undefined,
    createdAt: now,
    updatedAt: now,
  };
}
