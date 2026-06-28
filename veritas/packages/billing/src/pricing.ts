// Pricing: compute metered charges from usage beyond included plan units.

import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";
import { type Plan, type PlanLimit, getLimitForMetric } from "./plans.js";
import { type PeriodUsage } from "./usage-aggregator.js";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface MetricRate {
  readonly metric: UsageMetric;
  /** Price per unit in USDC micro-units (6 decimals), charged after includedUnits. */
  readonly pricePerUnit: bigint;
}

export interface PricingTier {
  readonly planId: string;
  readonly rates: readonly MetricRate[];
}

/** Overage rates for each plan (USDC micro-units per unit). */
export const PRICING_TIERS: readonly PricingTier[] = [
  {
    planId: "starter-monthly",
    rates: [
      { metric: "VERIFICATIONS", pricePerUnit: 50_000n },   // $0.05 per verification
      { metric: "CLAIMS", pricePerUnit: 2_000n },         // $0.002 per call
      { metric: "TOKENS", pricePerUnit: 100n },              // $0.0001 per 1k tokens effectively
      { metric: "SOURCES", pricePerUnit: 200_000n },         // $0.20 per source
    ],
  },
  {
    planId: "pro-monthly",
    rates: [
      { metric: "VERIFICATIONS", pricePerUnit: 30_000n },    // $0.03
      { metric: "CLAIMS", pricePerUnit: 1_000n },          // $0.001
      { metric: "TOKENS", pricePerUnit: 60n },
      { metric: "SOURCES", pricePerUnit: 100_000n },          // $0.10
    ],
  },
  {
    planId: "enterprise-monthly",
    rates: [
      { metric: "VERIFICATIONS", pricePerUnit: 10_000n },    // $0.01
      { metric: "CLAIMS", pricePerUnit: 500n },
      { metric: "TOKENS", pricePerUnit: 20n },
      { metric: "SOURCES", pricePerUnit: 50_000n },           // $0.05
    ],
  },
] as const;

export interface LineItem {
  readonly metric: UsageMetric;
  readonly totalQuantity: number;
  readonly includedQuantity: number;
  readonly overageQuantity: number;
  readonly pricePerUnit: bigint;
  readonly overageCharge: bigint;
}

export interface ChargeResult {
  readonly planId: string;
  readonly baseCharge: bigint;
  readonly lineItems: readonly LineItem[];
  readonly totalOverageCharge: bigint;
  readonly totalCharge: bigint;
}

function getPricingTier(planId: string): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.planId === planId);
}

function getRateForMetric(
  tier: PricingTier,
  metric: UsageMetric
): MetricRate | undefined {
  return tier.rates.find((r) => r.metric === metric);
}

export function computeCharges(
  plan: Plan,
  usages: readonly PeriodUsage[]
): ChargeResult {
  const tier = getPricingTier(plan.id);
  const lineItems: LineItem[] = [];
  let totalOverage = 0n;

  for (const usage of usages) {
    const limit: PlanLimit | undefined = getLimitForMetric(plan, usage.metric);
    const includedQuantity = limit?.includedUnits ?? 0;
    const overageQuantity = Math.max(0, usage.totalQuantity - includedQuantity);

    const rate = tier ? getRateForMetric(tier, usage.metric) : undefined;
    const pricePerUnit = rate?.pricePerUnit ?? 0n;
    const overageCharge = BigInt(overageQuantity) * pricePerUnit;

    totalOverage += overageCharge;

    lineItems.push({
      metric: usage.metric,
      totalQuantity: usage.totalQuantity,
      includedQuantity,
      overageQuantity,
      pricePerUnit,
      overageCharge,
    });
  }

  return {
    planId: plan.id,
    baseCharge: plan.basePrice,
    lineItems,
    totalOverageCharge: totalOverage,
    totalCharge: plan.basePrice + totalOverage,
  };
}

export function formatUsdcAmount(microUnits: bigint): string {
  const dollars = Number(microUnits) / 10 ** 6;
  return `$${dollars.toFixed(6)}`;
}
