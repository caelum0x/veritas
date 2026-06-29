// Aggregate a stream of reputation events into a single clamped score.

import { clampScore, asScore, Score, IsoTimestamp, isoToEpoch } from "@veritas/core";
import { effectiveDelta, ReputationEventKind } from "./weighting.js";
import { eventAgeWeight, DecayConfig, DEFAULT_DECAY_CONFIG } from "./decay.js";

/** A minimal reputation event as consumed by the aggregator. */
export interface AggregatorEvent {
  readonly kind: ReputationEventKind;
  readonly confidence: number;
  readonly occurredAt: IsoTimestamp;
}

export interface AggregationOptions {
  readonly decayConfig?: DecayConfig;
  /** Reference timestamp for decay calculation; defaults to now. */
  readonly referenceMs?: number;
}

export interface AggregationResult {
  readonly score: Score;
  readonly eventCount: number;
  readonly weightedSum: number;
  readonly totalWeight: number;
}

/**
 * Aggregate events into a single score using weighted mean of per-event deltas,
 * with age-based decay applied to each event's weight.
 * Starts from a neutral baseline of 0.5 and shifts by the weighted sum.
 */
export function aggregateEvents(
  events: ReadonlyArray<AggregatorEvent>,
  options: AggregationOptions = {},
): AggregationResult {
  const decayConfig = options.decayConfig ?? DEFAULT_DECAY_CONFIG;
  const refMs = options.referenceMs ?? Date.now();

  if (events.length === 0) {
    return {
      score: decayConfig.neutral,
      eventCount: 0,
      weightedSum: 0,
      totalWeight: 0,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const event of events) {
    const epochMs = isoToEpoch(event.occurredAt);
    const elapsedMs = refMs - (epochMs ?? refMs);
    const ageWeight = eventAgeWeight(elapsedMs, decayConfig.halfLifeMs);
    const delta = effectiveDelta(event.kind, event.confidence);
    weightedSum += delta * ageWeight;
    totalWeight += ageWeight;
  }

  const shift = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const raw = (decayConfig.neutral as number) + shift;
  const score = clampScore(raw);

  return {
    score,
    eventCount: events.length,
    weightedSum,
    totalWeight,
  };
}

/**
 * Merge two aggregation results (e.g., from different time windows) with a blend ratio.
 * `ratio` is the weight given to `a`; `1 - ratio` is given to `b`.
 */
export function mergeAggregations(
  a: AggregationResult,
  b: AggregationResult,
  ratio: number = 0.5,
): Score {
  const r = Math.min(Math.max(ratio, 0), 1);
  return clampScore(a.score * r + b.score * (1 - r));
}
