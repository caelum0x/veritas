// Rating: translate aggregated usage into monetary charges using plan rates.

import { UsageMetric } from "./event.js";
import { AggregatedUsage } from "./aggregation.js";
import { TieredPricingSchedule, computeTieredCharge, TieredChargeResult } from "./tier.js";

export interface MetricRate {
  readonly metric: UsageMetric;
  /** Units included in the base price; no charge until this threshold. */
  readonly includedUnits: number;
  /** Tiered pricing schedule for overage units. */
  readonly schedule: TieredPricingSchedule;
}

export interface RatingConfig {
  readonly planId: string;
  /** Base subscription charge in USDC micro-units. */
  readonly baseCharge: bigint;
  readonly rates: readonly MetricRate[];
}

export interface RatedLineItem {
  readonly metric: UsageMetric;
  readonly totalQuantity: number;
  readonly includedQuantity: number;
  readonly overageQuantity: number;
  readonly tieredResult: TieredChargeResult;
  readonly charge: bigint;
}

export interface RatingResult {
  readonly planId: string;
  readonly baseCharge: bigint;
  readonly lineItems: readonly RatedLineItem[];
  readonly overageCharge: bigint;
  readonly totalCharge: bigint;
}

function findRate(rates: readonly MetricRate[], metric: UsageMetric): MetricRate | undefined {
  return rates.find((r) => r.metric === metric);
}

/** Rate a collection of aggregated usage records against a plan's pricing config. */
export function rateUsage(
  aggregated: readonly AggregatedUsage[],
  config: RatingConfig
): RatingResult {
  const lineItems: RatedLineItem[] = [];
  let overageCharge = 0n;

  for (const usage of aggregated) {
    const rate = findRate(config.rates, usage.metric);
    const includedQuantity = rate?.includedUnits ?? 0;
    const overageQuantity = Math.max(0, usage.totalQuantity - includedQuantity);

    const tieredResult = rate
      ? computeTieredCharge(rate.schedule, overageQuantity)
      : { metric: usage.metric, quantity: overageQuantity, totalCharge: 0n, bandBreakdown: [] as const };

    const charge = tieredResult.totalCharge;
    overageCharge += charge;

    lineItems.push(
      Object.freeze({
        metric: usage.metric,
        totalQuantity: usage.totalQuantity,
        includedQuantity,
        overageQuantity,
        tieredResult,
        charge,
      })
    );
  }

  const totalCharge = config.baseCharge + overageCharge;

  return Object.freeze({
    planId: config.planId,
    baseCharge: config.baseCharge,
    lineItems: Object.freeze(lineItems),
    overageCharge,
    totalCharge,
  });
}

/** Summarise a rating result as a human-readable breakdown (USDC micro-units). */
export function describeRatingResult(result: RatingResult): string {
  const lines: string[] = [
    `Plan: ${result.planId}`,
    `Base: ${result.baseCharge}µUSDC`,
  ];
  for (const li of result.lineItems) {
    if (li.overageQuantity > 0) {
      lines.push(
        `  ${li.metric}: ${li.totalQuantity} total, ${li.includedQuantity} incl, ` +
          `${li.overageQuantity} overage → ${li.charge}µUSDC`
      );
    }
  }
  lines.push(`Total: ${result.totalCharge}µUSDC`);
  return lines.join("\n");
}
