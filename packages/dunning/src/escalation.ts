// Escalation steps — applies progressive account restrictions when dunning attempts are exhausted.

import { epochToIso } from "@veritas/core";
import type { DunningId, DunningStatus } from "./types.js";

/** The ordered severity levels for escalation actions. */
export type EscalationLevel = "warn" | "restrict" | "suspend" | "terminate";

/** An escalation policy entry maps an attempt threshold to an action level. */
export interface EscalationPolicy {
  /** Number of failed attempts required to trigger this level. */
  readonly afterAttempts: number;
  /** The escalation action to apply. */
  readonly level: EscalationLevel;
  /** Human-readable description of what happens at this level. */
  readonly description: string;
}

/** An applied escalation step record. */
export interface EscalationRecord {
  readonly dunningId: DunningId;
  readonly level: EscalationLevel;
  readonly triggeredAt: string;
  readonly description: string;
}

/** Default escalation policy aligned with the standard 4-attempt retry schedule. */
export const DEFAULT_ESCALATION_POLICY: readonly EscalationPolicy[] = [
  {
    afterAttempts: 1,
    level: "warn",
    description: "Send first warning notification to account owner.",
  },
  {
    afterAttempts: 2,
    level: "restrict",
    description: "Limit API rate limits and disable new resource creation.",
  },
  {
    afterAttempts: 3,
    level: "suspend",
    description: "Suspend service access; read-only mode enabled.",
  },
  {
    afterAttempts: 4,
    level: "terminate",
    description: "Cancel subscription and schedule data retention cleanup.",
  },
];

/** Returns the escalation level applicable for the given attempt count, or null if none. */
export function resolveEscalationLevel(
  failedAttempts: number,
  policy: readonly EscalationPolicy[] = DEFAULT_ESCALATION_POLICY
): EscalationPolicy | null {
  // Find the highest-priority policy whose threshold has been reached.
  const applicable = policy
    .filter((p) => failedAttempts >= p.afterAttempts)
    .sort((a, b) => b.afterAttempts - a.afterAttempts);

  return applicable[0] ?? null;
}

/** Creates an escalation record for the current attempt count. */
export function buildEscalationRecord(
  dunningId: DunningId,
  failedAttempts: number,
  policy: readonly EscalationPolicy[] = DEFAULT_ESCALATION_POLICY
): EscalationRecord | null {
  const matched = resolveEscalationLevel(failedAttempts, policy);
  if (!matched) {
    return null;
  }

  // Only record if this is exactly the threshold crossing, not repeated triggers.
  const exactMatch = policy.find((p) => p.afterAttempts === failedAttempts);
  if (!exactMatch) {
    return null;
  }

  return {
    dunningId,
    level: exactMatch.level,
    triggeredAt: epochToIso(Date.now()),
    description: exactMatch.description,
  };
}

/**
 * Maps an escalation level to the dunning status it transitions the process into.
 * Suspend and terminate levels both push the process toward EXHAUSTED/CANCELLED.
 */
export function escalationLevelToDunningStatus(
  level: EscalationLevel
): DunningStatus | null {
  switch (level) {
    case "warn":
    case "restrict":
      return "ACTIVE";
    case "suspend":
      return "PAUSED";
    case "terminate":
      return "EXHAUSTED";
    default:
      return null;
  }
}

/** Returns true if the escalation level means the subscription should be terminated. */
export function isTerminalEscalation(level: EscalationLevel): boolean {
  return level === "terminate";
}

/** Returns true if the escalation level means the account should be paused/suspended. */
export function isSuspensionEscalation(level: EscalationLevel): boolean {
  return level === "suspend" || level === "terminate";
}
