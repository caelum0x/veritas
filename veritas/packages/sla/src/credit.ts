// Service credit: compute compensation owed when an SLA breach is confirmed.
import { z } from "zod";
import { newId } from "@veritas/core";

export const CreditBasisSchema = z.enum([
  "fixed_usdc",
  "percent_of_period_fee",
  "per_minute_down",
]);
export type CreditBasis = z.infer<typeof CreditBasisSchema>;

export const CreditTierSchema = z.object({
  /** Minimum breach duration in seconds to qualify for this tier. */
  minBreachSeconds: z.number().int().nonnegative(),
  basis: CreditBasisSchema,
  /** Value: USDC base units (fixed_usdc), percent 0-100, or USDC/min. */
  amount: z.number().nonnegative(),
});
export type CreditTier = z.infer<typeof CreditTierSchema>;

export const ServiceCreditSchema = z.object({
  id: z.string(),
  breachId: z.string(),
  slaId: z.string(),
  organizationId: z.string(),
  /** Amount in USDC base units (6 decimals). */
  amountUsdc: z.number().int().nonnegative(),
  basis: CreditBasisSchema,
  /** ISO timestamp when the credit was calculated. */
  calculatedAt: z.string(),
  /** Optional period fee in USDC base units (required for percent_of_period_fee). */
  periodFeeUsdc: z.number().int().nonnegative().optional(),
  appliedAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ServiceCredit = z.infer<typeof ServiceCreditSchema>;

export interface CreditCalculationInput {
  breachId: string;
  slaId: string;
  organizationId: string;
  breachDurationSeconds: number;
  periodFeeUsdc?: number;
  tiers: readonly CreditTier[];
}

/** Select the highest-value applicable tier for the breach duration. */
function selectTier(tiers: readonly CreditTier[], breachSeconds: number): CreditTier | undefined {
  return [...tiers]
    .filter((t) => breachSeconds >= t.minBreachSeconds)
    .sort((a, b) => b.minBreachSeconds - a.minBreachSeconds)[0];
}

/** Calculate a ServiceCredit for a confirmed breach. Returns undefined if no tier applies. */
export function calculateCredit(input: CreditCalculationInput): ServiceCredit | undefined {
  const tier = selectTier(input.tiers, input.breachDurationSeconds);
  if (tier === undefined) return undefined;

  let amountUsdc = 0;
  switch (tier.basis) {
    case "fixed_usdc":
      amountUsdc = Math.round(tier.amount);
      break;
    case "percent_of_period_fee": {
      const fee = input.periodFeeUsdc ?? 0;
      amountUsdc = Math.round(fee * (tier.amount / 100));
      break;
    }
    case "per_minute_down": {
      const minutes = input.breachDurationSeconds / 60;
      amountUsdc = Math.round(minutes * tier.amount);
      break;
    }
  }

  return {
    id: newId("cred"),
    breachId: input.breachId,
    slaId: input.slaId,
    organizationId: input.organizationId,
    amountUsdc,
    basis: tier.basis,
    calculatedAt: new Date().toISOString(),
    periodFeeUsdc: input.periodFeeUsdc,
  };
}

/** Mark a credit as applied at the given timestamp. */
export function applyCredit(credit: ServiceCredit, at: string = new Date().toISOString()): ServiceCredit {
  return { ...credit, appliedAt: at };
}
