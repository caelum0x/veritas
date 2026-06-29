// Shared domain types for the reputation module.

import type { IsoTimestamp } from "@veritas/core";
import type { PtsScore } from "./pts-score.js";
import type { ReputationEventKind } from "./weighting.js";

/** Stable identifier for a reputation snapshot record. */
export type ReputationId = string & { readonly __reputationId: true };

/** An agent's reputation snapshot at a point in time. */
export interface ReputationSnapshot {
  readonly id: ReputationId;
  readonly agentId: string;
  readonly score: PtsScore;
  readonly eventCount: number;
  readonly lastEventAt: IsoTimestamp | undefined;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** A single scored reputation event persisted for an agent. */
export interface PersistedReputationEvent {
  readonly id: string;
  readonly agentId: string;
  readonly kind: ReputationEventKind;
  readonly confidence: number;
  readonly occurredAt: IsoTimestamp;
  readonly recordedAt: IsoTimestamp;
  readonly metadata: Record<string, unknown>;
}

/** Filter options for querying reputation events. */
export interface ReputationEventFilter {
  readonly agentId: string;
  readonly kinds?: ReadonlyArray<ReputationEventKind>;
  readonly since?: IsoTimestamp;
  readonly until?: IsoTimestamp;
  readonly limit?: number;
}

/** Options for calculating a reputation score. */
export interface ScoreCalculationOptions {
  /** Reference time for decay; defaults to now. */
  readonly referenceMs?: number;
  /** Override half-life in ms for decay. */
  readonly halfLifeMs?: number;
}
