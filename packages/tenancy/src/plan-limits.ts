// Per-tenant plan limit definitions and enforcement helpers
import { z } from "zod";
import { RateLimitedError } from "@veritas/core";

export const PlanLimitsSchema = z.object({
  maxUsers: z.number().int().positive(),
  maxVerificationsPerMonth: z.number().int().positive(),
  maxSourcesPerClaim: z.number().int().positive(),
  maxApiKeysPerOrg: z.number().int().positive(),
  maxWebhooks: z.number().int().positive(),
  maxStorageMb: z.number().positive(),
  allowCustomAgents: z.boolean(),
  allowAdvancedReports: z.boolean(),
});

export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const PLAN_LIMITS: Readonly<Record<string, PlanLimits>> = Object.freeze({
  free: {
    maxUsers: 3,
    maxVerificationsPerMonth: 100,
    maxSourcesPerClaim: 5,
    maxApiKeysPerOrg: 2,
    maxWebhooks: 1,
    maxStorageMb: 100,
    allowCustomAgents: false,
    allowAdvancedReports: false,
  },
  starter: {
    maxUsers: 10,
    maxVerificationsPerMonth: 2_000,
    maxSourcesPerClaim: 20,
    maxApiKeysPerOrg: 10,
    maxWebhooks: 5,
    maxStorageMb: 1_000,
    allowCustomAgents: false,
    allowAdvancedReports: true,
  },
  pro: {
    maxUsers: 50,
    maxVerificationsPerMonth: 20_000,
    maxSourcesPerClaim: 50,
    maxApiKeysPerOrg: 50,
    maxWebhooks: 20,
    maxStorageMb: 10_000,
    allowCustomAgents: true,
    allowAdvancedReports: true,
  },
  enterprise: {
    maxUsers: 1_000,
    maxVerificationsPerMonth: 500_000,
    maxSourcesPerClaim: 200,
    maxApiKeysPerOrg: 200,
    maxWebhooks: 100,
    maxStorageMb: 100_000,
    allowCustomAgents: true,
    allowAdvancedReports: true,
  },
});

export function getPlanLimits(planSlug: string): PlanLimits {
  const limits = PLAN_LIMITS[planSlug];
  if (limits === undefined) {
    return PLAN_LIMITS["free"] as PlanLimits;
  }
  return limits;
}

export function assertWithinLimit(
  current: number,
  max: number,
  resource: string
): void {
  if (current >= max) {
    throw new RateLimitedError({
      message: `Plan limit reached for '${resource}': ${current}/${max}`,
    });
  }
}
