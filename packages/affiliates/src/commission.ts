// Commission calculation: applies tier rules to convert sale revenue into affiliate earnings.

import { z } from "zod";
import type { Tier } from "./tier.js";

export const SaleEventSchema = z.object({
  /** Gross revenue of the referred sale in USDC base units. */
  grossRevenueBaseUnits: z.bigint(),
  /** ISO timestamp of the sale. */
  occurredAt: z.string(),
  /** Opaque order or subscription identifier. */
  orderId: z.string(),
  /** Affiliate whose referral is credited. */
  affiliateId: z.string(),
});

export type SaleEvent = z.infer<typeof SaleEventSchema>;

export interface CommissionResult {
  readonly affiliateId: string;
  readonly orderId: string;
  readonly tierId: string;
  readonly grossRevenueBaseUnits: bigint;
  readonly commissionBaseUnits: bigint;
  readonly appliedRateBasisPoints: number | null;
  readonly appliedFlatBaseUnits: bigint | null;
  readonly wasCapped: boolean;
}

export function calculateCommission(sale: SaleEvent, tier: Tier): CommissionResult {
  let raw: bigint;
  let appliedRate: number | null = null;
  let appliedFlat: bigint | null = null;

  if (tier.commissionType === "percentage") {
    // rateBasisPoints: 1 bp = 0.01% = factor of 1/10000
    raw = (sale.grossRevenueBaseUnits * BigInt(tier.rateBasisPoints)) / 10_000n;
    appliedRate = tier.rateBasisPoints;
  } else {
    raw = tier.flatAmountBaseUnits;
    appliedFlat = tier.flatAmountBaseUnits;
  }

  let commissionBaseUnits: bigint = raw;
  let wasCapped = false;

  if (tier.capPerConversionBaseUnits !== null && raw > tier.capPerConversionBaseUnits) {
    commissionBaseUnits = tier.capPerConversionBaseUnits;
    wasCapped = true;
  }

  return {
    affiliateId: sale.affiliateId,
    orderId: sale.orderId,
    tierId: tier.id,
    grossRevenueBaseUnits: sale.grossRevenueBaseUnits,
    commissionBaseUnits,
    appliedRateBasisPoints: appliedRate,
    appliedFlatBaseUnits: appliedFlat,
    wasCapped,
  };
}

export function sumCommissions(results: readonly CommissionResult[]): bigint {
  return results.reduce((acc, r) => acc + r.commissionBaseUnits, 0n);
}

/** Returns the effective rate as a fraction (0–1) for display purposes. */
export function effectiveRate(result: CommissionResult): number {
  if (result.grossRevenueBaseUnits === 0n) return 0;
  return Number(result.commissionBaseUnits) / Number(result.grossRevenueBaseUnits);
}

/** Batch calculation: apply the same tier to multiple sales. */
export function calculateBatchCommissions(
  sales: readonly SaleEvent[],
  tier: Tier
): readonly CommissionResult[] {
  return sales.map((s) => calculateCommission(s, tier));
}
