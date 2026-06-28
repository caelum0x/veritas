// Reputation badges awarded to agents based on score thresholds and activity milestones.

import { z } from "zod";
import { Score, asScore } from "@veritas/core";

/** Badge identifiers. */
export const BadgeKindSchema = z.enum([
  "NEWCOMER",
  "VERIFIED",
  "TRUSTED",
  "EXPERT",
  "ELITE",
  "DISPUTE_WINNER",
  "HIGH_VOLUME",
  "CONSISTENT",
  "EARLY_ADOPTER",
]);

export type BadgeKind = z.infer<typeof BadgeKindSchema>;

/** Awarded badge with the timestamp it was granted. */
export interface Badge {
  readonly kind: BadgeKind;
  readonly grantedAt: string;
  readonly label: string;
  readonly description: string;
}

/** Criteria required to earn a badge. */
export interface BadgeCriteria {
  readonly minScore?: Score;
  readonly minEventCount?: number;
  readonly minDisputeWins?: number;
  readonly minOrderCount?: number;
  readonly isEarlyAdopter?: boolean;
}

/** Static badge definitions: label, description, and award criteria. */
export const BADGE_DEFINITIONS: Readonly<
  Record<BadgeKind, { label: string; description: string; criteria: BadgeCriteria }>
> = Object.freeze({
  NEWCOMER: {
    label: "Newcomer",
    description: "Joined the Veritas network.",
    criteria: { minEventCount: 1 },
  },
  VERIFIED: {
    label: "Verified",
    description: "Achieved a trust score of 0.60 or above.",
    criteria: { minScore: asScore(0.6) },
  },
  TRUSTED: {
    label: "Trusted",
    description: "Achieved a trust score of 0.75 or above.",
    criteria: { minScore: asScore(0.75) },
  },
  EXPERT: {
    label: "Expert",
    description: "Achieved a trust score of 0.88 or above.",
    criteria: { minScore: asScore(0.88) },
  },
  ELITE: {
    label: "Elite",
    description: "Achieved a trust score of 0.95 or above.",
    criteria: { minScore: asScore(0.95) },
  },
  DISPUTE_WINNER: {
    label: "Dispute Winner",
    description: "Won 3 or more disputes.",
    criteria: { minDisputeWins: 3 },
  },
  HIGH_VOLUME: {
    label: "High Volume",
    description: "Completed 50 or more orders.",
    criteria: { minOrderCount: 50 },
  },
  CONSISTENT: {
    label: "Consistent",
    description: "Accumulated 100 or more reputation events.",
    criteria: { minEventCount: 100 },
  },
  EARLY_ADOPTER: {
    label: "Early Adopter",
    description: "Joined during the platform's early-access period.",
    criteria: { isEarlyAdopter: true },
  },
});

/** Context needed to evaluate which badges an agent qualifies for. */
export interface BadgeContext {
  readonly score: Score;
  readonly eventCount: number;
  readonly disputeWins: number;
  readonly orderCount: number;
  readonly isEarlyAdopter: boolean;
  readonly now: string;
}

/** Evaluate all badge criteria and return newly earned badges not already held. */
export function evaluateBadges(
  ctx: BadgeContext,
  currentBadges: ReadonlyArray<BadgeKind>,
): ReadonlyArray<Badge> {
  const held = new Set<BadgeKind>(currentBadges);
  const earned: Badge[] = [];

  for (const [rawKind, def] of Object.entries(BADGE_DEFINITIONS)) {
    const kind = rawKind as BadgeKind;
    if (held.has(kind)) continue;
    if (qualifies(ctx, def.criteria)) {
      earned.push({
        kind,
        grantedAt: ctx.now,
        label: def.label,
        description: def.description,
      });
    }
  }

  return earned;
}

function qualifies(ctx: BadgeContext, criteria: BadgeCriteria): boolean {
  if (criteria.minScore !== undefined && ctx.score < criteria.minScore) return false;
  if (criteria.minEventCount !== undefined && ctx.eventCount < criteria.minEventCount)
    return false;
  if (criteria.minDisputeWins !== undefined && ctx.disputeWins < criteria.minDisputeWins)
    return false;
  if (criteria.minOrderCount !== undefined && ctx.orderCount < criteria.minOrderCount)
    return false;
  if (criteria.isEarlyAdopter === true && !ctx.isEarlyAdopter) return false;
  return true;
}
