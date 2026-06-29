// Commission tiers: defines rate schedules and thresholds for affiliate levels.

import { z } from "zod";

export const CommissionTypeSchema = z.enum(["percentage", "flat_usdc"]);
export type CommissionType = z.infer<typeof CommissionTypeSchema>;

export const TierSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  description: z.string(),
  /** Minimum cumulative conversions to qualify for this tier. */
  minConversions: z.number().int().nonnegative(),
  /** Minimum cumulative revenue (USDC base units) to qualify. */
  minRevenueBaseUnits: z.bigint(),
  commissionType: CommissionTypeSchema,
  /** Rate in basis points (1 bp = 0.01%) when type is "percentage". */
  rateBasisPoints: z.number().int().nonnegative(),
  /** Flat commission per conversion in USDC base units when type is "flat_usdc". */
  flatAmountBaseUnits: z.bigint(),
  /** Maximum commission per conversion in base units; null = uncapped. */
  capPerConversionBaseUnits: z.bigint().nullable(),
  /** Attribution window in seconds. */
  attributionWindowSeconds: z.number().int().positive(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

export type Tier = z.infer<typeof TierSchema>;

const USDC = (dollars: number): bigint => BigInt(Math.round(dollars * 1_000_000));

/** Built-in tier catalog — caller may extend or override. */
export const DEFAULT_TIERS: readonly Tier[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Entry-level affiliate: 10% commission on referred revenue",
    minConversions: 0,
    minRevenueBaseUnits: 0n,
    commissionType: "percentage",
    rateBasisPoints: 1000, // 10%
    flatAmountBaseUnits: 0n,
    capPerConversionBaseUnits: USDC(50),
    attributionWindowSeconds: 30 * 24 * 60 * 60, // 30 days
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "silver",
    name: "Silver",
    description: "15% commission after 10 conversions or $500 revenue",
    minConversions: 10,
    minRevenueBaseUnits: USDC(500),
    commissionType: "percentage",
    rateBasisPoints: 1500, // 15%
    flatAmountBaseUnits: 0n,
    capPerConversionBaseUnits: USDC(100),
    attributionWindowSeconds: 45 * 24 * 60 * 60, // 45 days
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "gold",
    name: "Gold",
    description: "20% commission after 50 conversions or $5 000 revenue",
    minConversions: 50,
    minRevenueBaseUnits: USDC(5_000),
    commissionType: "percentage",
    rateBasisPoints: 2000, // 20%
    flatAmountBaseUnits: 0n,
    capPerConversionBaseUnits: USDC(250),
    attributionWindowSeconds: 60 * 24 * 60 * 60, // 60 days
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "platinum",
    name: "Platinum",
    description: "25% uncapped commission for top-performing partners",
    minConversions: 200,
    minRevenueBaseUnits: USDC(25_000),
    commissionType: "percentage",
    rateBasisPoints: 2500, // 25%
    flatAmountBaseUnits: 0n,
    capPerConversionBaseUnits: null,
    attributionWindowSeconds: 90 * 24 * 60 * 60, // 90 days
    isActive: true,
    sortOrder: 3,
  },
];

export function findTierById(tiers: readonly Tier[], id: string): Tier | undefined {
  return tiers.find((t) => t.id === id);
}

export function eligibleTier(
  tiers: readonly Tier[],
  conversions: number,
  revenueBaseUnits: bigint
): Tier | undefined {
  return [...tiers]
    .filter((t) => t.isActive)
    .sort((a, b) => b.sortOrder - a.sortOrder)
    .find(
      (t) =>
        conversions >= t.minConversions && revenueBaseUnits >= t.minRevenueBaseUnits
    );
}

export function nextTier(
  tiers: readonly Tier[],
  current: Tier
): Tier | undefined {
  const active = [...tiers]
    .filter((t) => t.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = active.findIndex((t) => t.id === current.id);
  return idx >= 0 && idx < active.length - 1 ? active[idx + 1] : undefined;
}
