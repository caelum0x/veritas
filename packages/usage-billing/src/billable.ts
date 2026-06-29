// billable.ts: define a billable metric descriptor with pricing and tier configuration.

import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export const BillableMetricSchema = z.object({
  metric: UsageMetricSchema,
  /** Human-readable display name. */
  displayName: z.string().min(1),
  /** Description of what is being metered. */
  description: z.string(),
  /** Included units before overage billing begins. */
  includedUnits: z.number().int().nonnegative(),
  /** Hard cap per billing window; null means unlimited. */
  hardCap: z.number().int().positive().nullable(),
  /** Price per overage unit in USDC micro-units (6 decimals). */
  pricePerUnit: z.bigint().nonnegative(),
  /** Whether metered overage billing is enabled for this metric. */
  meteringEnabled: z.boolean(),
});

export type BillableMetric = z.infer<typeof BillableMetricSchema>;

export function createBillableMetric(
  metric: UsageMetric,
  displayName: string,
  description: string,
  includedUnits: number,
  pricePerUnit: bigint,
  opts: { hardCap?: number | null; meteringEnabled?: boolean } = {}
): BillableMetric {
  return {
    metric,
    displayName,
    description,
    includedUnits,
    hardCap: opts.hardCap ?? null,
    pricePerUnit,
    meteringEnabled: opts.meteringEnabled ?? true,
  };
}

export function isWithinHardCap(
  metric: BillableMetric,
  quantity: number
): boolean {
  if (metric.hardCap === null) return true;
  return quantity <= metric.hardCap;
}

export function overageQuantity(metric: BillableMetric, total: number): number {
  return Math.max(0, total - metric.includedUnits);
}
