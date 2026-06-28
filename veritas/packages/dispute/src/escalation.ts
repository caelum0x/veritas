// Escalation logic: automatically promote disputes that stall or breach SLA thresholds.

import { type IsoTimestamp, type Id, type AppError, ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { DisputeId, EscalationLevel, EscalationRecord } from "./types.js";

export type EscalationPolicy = {
  readonly maxHoursAtLevel: Record<EscalationLevel, number>;
  readonly maxEscalations: number;
};

export const DEFAULT_ESCALATION_POLICY: EscalationPolicy = {
  maxHoursAtLevel: { peer: 48, moderator: 96, arbitration: 168 },
  maxEscalations: 3,
};

export type EscalationTrigger =
  | { kind: "sla_breach"; breachedAt: IsoTimestamp }
  | { kind: "party_request"; requestedBy: Id<string> }
  | { kind: "policy_violation"; detail: string };

export type EscalationResult = {
  readonly disputeId: DisputeId;
  readonly fromLevel: EscalationLevel;
  readonly toLevel: EscalationLevel;
  readonly trigger: EscalationTrigger;
  readonly escalatedAt: IsoTimestamp;
};

const LEVEL_ORDER: EscalationLevel[] = ["peer", "moderator", "arbitration"];

export function nextEscalationLevel(
  current: EscalationLevel,
): EscalationLevel | null {
  const idx = LEVEL_ORDER.indexOf(current);
  return idx >= 0 && idx < LEVEL_ORDER.length - 1
    ? LEVEL_ORDER[idx + 1]!
    : null;
}

export function shouldEscalate(
  assignedAt: IsoTimestamp,
  currentLevel: EscalationLevel,
  now: IsoTimestamp,
  policy: EscalationPolicy,
): boolean {
  const maxHours = policy.maxHoursAtLevel[currentLevel];
  const elapsed =
    (new Date(now).getTime() - new Date(assignedAt).getTime()) / 3_600_000;
  return elapsed > maxHours;
}

export function buildEscalation(
  disputeId: DisputeId,
  history: readonly EscalationRecord[],
  currentLevel: EscalationLevel,
  trigger: EscalationTrigger,
  now: IsoTimestamp,
  policy: EscalationPolicy,
): Result<EscalationResult, AppError> {
  if (history.length >= policy.maxEscalations) {
    return err({
      code: "CONFLICT",
      message: "Maximum escalations reached for this dispute.",
    } as AppError);
  }
  const toLevel = nextEscalationLevel(currentLevel);
  if (toLevel === null) {
    return err({
      code: "CONFLICT",
      message: "Dispute is already at the highest escalation level.",
    } as AppError);
  }
  return ok({
    disputeId,
    fromLevel: currentLevel,
    toLevel,
    trigger,
    escalatedAt: now,
  });
}
