// Pricing tier definitions for agent store services.
import { Usdc } from "@veritas/core";

export type PricingModel = "flat" | "per_call" | "per_token" | "tiered";

export interface PricingTier {
  readonly name: string;
  readonly model: PricingModel;
  readonly unitPrice: Usdc;
  readonly minCallsPerMonth: number;
  readonly maxCallsPerMonth: number | null;
  readonly features: readonly string[];
}

export const FREE_TIER: PricingTier = {
  name: "free",
  model: "per_call",
  unitPrice: Usdc.fromBaseUnits(0n),
  minCallsPerMonth: 0,
  maxCallsPerMonth: 100,
  features: ["basic_verification", "public_sources"],
};

export const PRO_TIER: PricingTier = {
  name: "pro",
  model: "per_call",
  unitPrice: Usdc.fromBaseUnits(500n), // $0.005 per call
  minCallsPerMonth: 0,
  maxCallsPerMonth: 10_000,
  features: ["advanced_verification", "all_sources", "confidence_scores", "citations"],
};

export const ENTERPRISE_TIER: PricingTier = {
  name: "enterprise",
  model: "tiered",
  unitPrice: Usdc.fromBaseUnits(250n), // $0.0025 per call
  minCallsPerMonth: 10_000,
  maxCallsPerMonth: null,
  features: [
    "advanced_verification",
    "all_sources",
    "confidence_scores",
    "citations",
    "sla_guarantee",
    "dedicated_support",
    "custom_sources",
  ],
};

export const ALL_TIERS: readonly PricingTier[] = [FREE_TIER, PRO_TIER, ENTERPRISE_TIER];

export function findTierByName(name: string): PricingTier | undefined {
  return ALL_TIERS.find((t) => t.name === name);
}

export function computeCallCost(tier: PricingTier, calls: number): Usdc {
  return Usdc.fromBaseUnits(tier.unitPrice.baseUnits * BigInt(calls));
}

export function isWithinTierLimits(tier: PricingTier, callCount: number): boolean {
  if (callCount < tier.minCallsPerMonth) return false;
  if (tier.maxCallsPerMonth === null) return true;
  return callCount <= tier.maxCallsPerMonth;
}
