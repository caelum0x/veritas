// Event-type weight table used by the aggregator to scale reputation contributions.

import { z } from "zod";

/** Canonical event kinds that affect reputation. */
export const ReputationEventKindSchema = z.enum([
  "VERIFICATION_COMPLETED",
  "VERIFICATION_DISPUTED",
  "DISPUTE_RESOLVED_WIN",
  "DISPUTE_RESOLVED_LOSS",
  "RATING_SUBMITTED",
  "REVIEW_SUBMITTED",
  "DELIVERY_ON_TIME",
  "DELIVERY_LATE",
  "DELIVERY_FAILED",
  "ORDER_COMPLETED",
  "ORDER_CANCELLED",
  "INACTIVITY_PENALTY",
  "BADGE_EARNED",
  "TRUST_BOND_STAKED",
]);

export type ReputationEventKind = z.infer<typeof ReputationEventKindSchema>;

/** Weight entry: base delta [-1, 1] and optional confidence multiplier range. */
export interface WeightEntry {
  readonly delta: number;
  readonly minConfidence: number;
  readonly maxConfidence: number;
}

/** Immutable weight table mapping event kind to its contribution parameters. */
export const EVENT_WEIGHTS: Readonly<Record<ReputationEventKind, WeightEntry>> =
  Object.freeze({
    VERIFICATION_COMPLETED: { delta: 0.05, minConfidence: 0.8, maxConfidence: 1.0 },
    VERIFICATION_DISPUTED: { delta: -0.08, minConfidence: 0.5, maxConfidence: 1.0 },
    DISPUTE_RESOLVED_WIN: { delta: 0.06, minConfidence: 0.7, maxConfidence: 1.0 },
    DISPUTE_RESOLVED_LOSS: { delta: -0.1, minConfidence: 0.7, maxConfidence: 1.0 },
    RATING_SUBMITTED: { delta: 0.03, minConfidence: 0.6, maxConfidence: 1.0 },
    REVIEW_SUBMITTED: { delta: 0.04, minConfidence: 0.65, maxConfidence: 1.0 },
    DELIVERY_ON_TIME: { delta: 0.04, minConfidence: 0.9, maxConfidence: 1.0 },
    DELIVERY_LATE: { delta: -0.03, minConfidence: 0.8, maxConfidence: 1.0 },
    DELIVERY_FAILED: { delta: -0.12, minConfidence: 0.9, maxConfidence: 1.0 },
    ORDER_COMPLETED: { delta: 0.03, minConfidence: 0.85, maxConfidence: 1.0 },
    ORDER_CANCELLED: { delta: -0.05, minConfidence: 0.75, maxConfidence: 1.0 },
    INACTIVITY_PENALTY: { delta: -0.02, minConfidence: 1.0, maxConfidence: 1.0 },
    BADGE_EARNED: { delta: 0.02, minConfidence: 1.0, maxConfidence: 1.0 },
    TRUST_BOND_STAKED: { delta: 0.07, minConfidence: 0.9, maxConfidence: 1.0 },
  });

/**
 * Compute the effective signed delta for an event given its confidence.
 * Confidence is clamped to [minConfidence, maxConfidence] and linearly mapped.
 */
export function effectiveDelta(
  kind: ReputationEventKind,
  confidence: number,
): number {
  const w = EVENT_WEIGHTS[kind];
  const clamped = Math.min(Math.max(confidence, w.minConfidence), w.maxConfidence);
  const range = w.maxConfidence - w.minConfidence || 1;
  const ratio = (clamped - w.minConfidence) / range;
  return w.delta * ratio;
}
