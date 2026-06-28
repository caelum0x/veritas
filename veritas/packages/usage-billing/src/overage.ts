// overage.ts: compute per-metric overage charges above included plan units.

import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";
import { type BillingWindow } from "./window.js";
import { type BillableMetric } from "./billable.js";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface OverageInput {
  readonly metric: UsageMetric;
  readonly totalQuantity: number;
  readonly includedUnits: number;
  readonly pricePerUnit: bigint;
}

export interface OverageLine {
  readonly metric: UsageMetric;
  readonly totalQuantity: number;
  readonly includedUnits: number;
  readonly overageQuantity: number;
  readonly pricePerUnit: bigint;
  readonly charge: bigint;
}

export interface OverageResult {
  readonly window: BillingWindow;
  readonly lines: readonly OverageLine[];
  readonly totalCharge: bigint;
}

function computeOverageLine(input: OverageInput): OverageLine {
  const overageQuantity = Math.max(0, input.totalQuantity - input.includedUnits);
  const charge = BigInt(overageQuantity) * input.pricePerUnit;
  return {
    metric: input.metric,
    totalQuantity: input.totalQuantity,
    includedUnits: input.includedUnits,
    overageQuantity,
    pricePerUnit: input.pricePerUnit,
    charge,
  };
}

export function computeOverages(
  window: BillingWindow,
  metrics: readonly BillableMetric[],
  usageTotals: ReadonlyMap<UsageMetric, number>
): OverageResult {
  const lines = metrics.map((m) => {
    const totalQuantity = usageTotals.get(m.metric) ?? 0;
    return computeOverageLine({
      metric: m.metric,
      totalQuantity,
      includedUnits: m.includedUnits,
      pricePerUnit: m.pricePerUnit,
    });
  });

  const totalCharge = lines.reduce((sum, l) => sum + l.charge, 0n);

  return { window, lines, totalCharge };
}
