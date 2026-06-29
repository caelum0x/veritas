// Partner access tier: defines capability and rate-limit levels for partners.

import { z } from "zod";
import { newId, type Id } from "@veritas/core";

export type PartnerTierId = Id<"ptier">;

export function newPartnerTierId(): PartnerTierId {
  return newId("ptier");
}

export const TierLevelSchema = z.enum(["bronze", "silver", "gold", "platinum"]);
export type TierLevel = z.infer<typeof TierLevelSchema>;

export const TierCapabilitiesSchema = z.object({
  maxRequestsPerMinute: z.number().int().positive(),
  maxRequestsPerDay: z.number().int().positive(),
  maxConcurrentJobs: z.number().int().positive(),
  webhooksEnabled: z.boolean(),
  bulkApiEnabled: z.boolean(),
  analyticsEnabled: z.boolean(),
  prioritySupport: z.boolean(),
  dedicatedEndpoint: z.boolean(),
  slaUptimePercent: z.number().min(0).max(100),
});
export type TierCapabilities = z.infer<typeof TierCapabilitiesSchema>;

export const PartnerTierSchema = z.object({
  id: z.string().startsWith("ptier_"),
  name: z.string().min(1),
  level: TierLevelSchema,
  capabilities: TierCapabilitiesSchema,
  monthlyFeeCents: z.number().int().nonnegative(),
  revenueSharePercent: z.number().min(0).max(100),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PartnerTier = z.infer<typeof PartnerTierSchema>;

export const CreatePartnerTierSchema = z.object({
  name: z.string().min(1),
  level: TierLevelSchema,
  capabilities: TierCapabilitiesSchema,
  monthlyFeeCents: z.number().int().nonnegative(),
  revenueSharePercent: z.number().min(0).max(100),
});
export type CreatePartnerTier = z.infer<typeof CreatePartnerTierSchema>;

export const UpdatePartnerTierSchema = z.object({
  name: z.string().min(1).optional(),
  capabilities: TierCapabilitiesSchema.partial().optional(),
  monthlyFeeCents: z.number().int().nonnegative().optional(),
  revenueSharePercent: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});
export type UpdatePartnerTier = z.infer<typeof UpdatePartnerTierSchema>;

export const DEFAULT_TIER_CAPABILITIES: Record<TierLevel, TierCapabilities> = {
  bronze: {
    maxRequestsPerMinute: 60,
    maxRequestsPerDay: 5_000,
    maxConcurrentJobs: 2,
    webhooksEnabled: false,
    bulkApiEnabled: false,
    analyticsEnabled: false,
    prioritySupport: false,
    dedicatedEndpoint: false,
    slaUptimePercent: 99.0,
  },
  silver: {
    maxRequestsPerMinute: 300,
    maxRequestsPerDay: 25_000,
    maxConcurrentJobs: 10,
    webhooksEnabled: true,
    bulkApiEnabled: false,
    analyticsEnabled: true,
    prioritySupport: false,
    dedicatedEndpoint: false,
    slaUptimePercent: 99.5,
  },
  gold: {
    maxRequestsPerMinute: 1_000,
    maxRequestsPerDay: 100_000,
    maxConcurrentJobs: 50,
    webhooksEnabled: true,
    bulkApiEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
    dedicatedEndpoint: false,
    slaUptimePercent: 99.9,
  },
  platinum: {
    maxRequestsPerMinute: 5_000,
    maxRequestsPerDay: 1_000_000,
    maxConcurrentJobs: 200,
    webhooksEnabled: true,
    bulkApiEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
    dedicatedEndpoint: true,
    slaUptimePercent: 99.99,
  },
};

export function makePartnerTier(input: CreatePartnerTier, now: string): PartnerTier {
  return {
    id: newPartnerTierId() as string,
    name: input.name,
    level: input.level,
    capabilities: input.capabilities,
    monthlyFeeCents: input.monthlyFeeCents,
    revenueSharePercent: input.revenueSharePercent,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyTierUpdate(tier: PartnerTier, update: UpdatePartnerTier, now: string): PartnerTier {
  return {
    ...tier,
    name: update.name ?? tier.name,
    capabilities:
      update.capabilities !== undefined
        ? { ...tier.capabilities, ...update.capabilities }
        : tier.capabilities,
    monthlyFeeCents: update.monthlyFeeCents ?? tier.monthlyFeeCents,
    revenueSharePercent: update.revenueSharePercent ?? tier.revenueSharePercent,
    active: update.active ?? tier.active,
    updatedAt: now,
  };
}
