// Score calculator: loads persisted events and computes PTS via aggregation + decay.

import {
  type Result,
  ok,
  err,
  type IsoTimestamp,
  epochToIso,
  newId,
} from "@veritas/core";
import { aggregateEvents, type AggregatorEvent } from "./aggregator.js";
import { DEFAULT_DECAY_CONFIG } from "./decay.js";
import { clampPtsScore, type PtsScore, PTS_INITIAL } from "./pts-score.js";
import type { ReputationStore } from "./store.js";
import { ReputationNotFoundError } from "./errors.js";
import type {
  PersistedReputationEvent,
  ScoreCalculationOptions,
  ReputationSnapshot,
} from "./types.js";
import type { ReputationEventKind } from "./weighting.js";

/** Input for recording a new reputation event. */
export interface RecordEventInput {
  readonly agentId: string;
  readonly kind: ReputationEventKind;
  readonly confidence: number;
  readonly occurredAt?: IsoTimestamp;
  readonly metadata?: Record<string, unknown>;
}

/** Result of a score recalculation. */
export interface ScoreResult {
  readonly agentId: string;
  readonly score: PtsScore;
  readonly eventCount: number;
  readonly snapshot: ReputationSnapshot;
}

/** Derive a PtsScore from raw persisted events using aggregation and decay. */
export function deriveScore(
  events: ReadonlyArray<PersistedReputationEvent>,
  options: ScoreCalculationOptions = {},
): PtsScore {
  if (events.length === 0) {
    return PTS_INITIAL as unknown as PtsScore;
  }

  const aggEvents: AggregatorEvent[] = events.map((e) => ({
    kind: e.kind,
    confidence: e.confidence,
    occurredAt: e.occurredAt,
  }));

  const decayConfig = options.halfLifeMs
    ? { ...DEFAULT_DECAY_CONFIG, halfLifeMs: options.halfLifeMs }
    : DEFAULT_DECAY_CONFIG;

  const result = aggregateEvents(aggEvents, {
    decayConfig,
    referenceMs: options.referenceMs ?? Date.now(),
  });

  return clampPtsScore(result.score as number);
}

/** High-level calculator that reads from store, recalculates, and persists. */
export class ReputationCalculator {
  constructor(private readonly store: ReputationStore) {}

  /** Record a new event and recompute the agent's score. */
  async recordAndRecalculate(
    input: RecordEventInput,
    options: ScoreCalculationOptions = {},
  ): Promise<Result<ScoreResult, ReputationNotFoundError | Error>> {
    const now = epochToIso(Date.now());

    const event: PersistedReputationEvent = {
      id: newId("rep"),
      agentId: input.agentId,
      kind: input.kind,
      confidence: Math.min(1, Math.max(0, input.confidence)),
      occurredAt: input.occurredAt ?? now,
      recordedAt: now,
      metadata: input.metadata ?? {},
    };

    const recordResult = await this.store.recordEvent(event);
    if (!recordResult.ok) {
      return err(recordResult.error as Error);
    }

    return this.recalculate(input.agentId, options);
  }

  /** Recompute the score for an agent from all stored events. */
  async recalculate(
    agentId: string,
    options: ScoreCalculationOptions = {},
  ): Promise<Result<ScoreResult, never>> {
    const eventsResult = await this.store.listEvents({ agentId });
    // listEvents always returns ok
    const events = (eventsResult as { ok: true; value: ReadonlyArray<PersistedReputationEvent> }).value;

    const score = deriveScore(events, options);
    const lastEvent = events.at(-1);
    const lastEventAt = lastEvent?.occurredAt;

    const upsertResult = await this.store.upsert(
      agentId,
      score,
      events.length,
      lastEventAt,
    );

    const snapshot = (upsertResult as { ok: true; value: ReputationSnapshot }).value;

    return ok({ agentId, score, eventCount: events.length, snapshot });
  }
}
