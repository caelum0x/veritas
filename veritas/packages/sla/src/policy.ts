// SLA policy: reusable rule set (notification thresholds, credit tiers, escalation).
import { z } from "zod";
import { newId } from "@veritas/core";
import { CreditTierSchema } from "./credit.js";

export const EscalationLevelSchema = z.object({
  /** Breach duration in seconds before this level triggers. */
  afterSeconds: z.number().int().positive(),
  notifyChannels: z.array(z.string()),
  label: z.string().min(1),
});
export type EscalationLevel = z.infer<typeof EscalationLevelSchema>;

export const SlaPolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  organizationId: z.string(),
  /** Credit tiers applied when a breach is confirmed. */
  creditTiers: z.array(CreditTierSchema).default([]),
  /** Ordered escalation levels (earliest first). */
  escalationLevels: z.array(EscalationLevelSchema).default([]),
  /** Warn when compliance drops below this fraction (0–1). */
  warnThreshold: z.number().min(0).max(1).default(0.99),
  /** Auto-suspend SLA when compliance drops below this fraction. */
  suspendThreshold: z.number().min(0).max(1).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SlaPolicy = z.infer<typeof SlaPolicySchema>;

export const CreateSlaPolicySchema = SlaPolicySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSlaPolicy = z.infer<typeof CreateSlaPolicySchema>;

export function makeSlaPolicy(input: CreateSlaPolicy): SlaPolicy {
  const now = new Date().toISOString();
  return {
    ...input,
    id: newId("slap"),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSlaPolicy(
  policy: SlaPolicy,
  patch: Partial<Omit<SlaPolicy, "id" | "createdAt">>
): SlaPolicy {
  return { ...policy, ...patch, updatedAt: new Date().toISOString() };
}

/** Return the escalation level that applies for the given breach duration, or undefined. */
export function resolveEscalation(policy: SlaPolicy, breachSeconds: number): EscalationLevel | undefined {
  return [...policy.escalationLevels]
    .filter((l) => breachSeconds >= l.afterSeconds)
    .sort((a, b) => b.afterSeconds - a.afterSeconds)[0];
}

/** Return true if compliance ratio is below the warn threshold. */
export function shouldWarn(policy: SlaPolicy, complianceRatio: number): boolean {
  return complianceRatio < policy.warnThreshold;
}

/** Return true if compliance ratio is below the suspend threshold (if configured). */
export function shouldSuspend(policy: SlaPolicy, complianceRatio: number): boolean {
  return policy.suspendThreshold !== undefined && complianceRatio < policy.suspendThreshold;
}
