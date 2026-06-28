// preview.ts: generate an invoice preview from current window usage before billing runs.

import { IsoTimestamp, epochToIso, Id } from "@veritas/core";
import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";
import { type BillingWindow } from "./window.js";
import { type BillableMetric } from "./billable.js";
import { computeOverages, type OverageLine } from "./overage.js";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface PreviewLineItem {
  readonly metric: UsageMetric;
  readonly displayName: string;
  readonly totalQuantity: number;
  readonly includedUnits: number;
  readonly overageQuantity: number;
  readonly pricePerUnit: bigint;
  readonly charge: bigint;
}

export interface InvoicePreview {
  readonly organizationId: Id<string>;
  readonly window: BillingWindow;
  readonly baseCharge: bigint;
  readonly lineItems: readonly PreviewLineItem[];
  readonly totalOverageCharge: bigint;
  readonly estimatedTotal: bigint;
  readonly generatedAt: IsoTimestamp;
  readonly isFinal: boolean;
}

function mergeWithDisplayNames(
  lines: readonly OverageLine[],
  metrics: readonly BillableMetric[]
): readonly PreviewLineItem[] {
  const metricMap = new Map(metrics.map((m) => [m.metric, m]));
  return lines.map((line) => {
    const billable = metricMap.get(line.metric);
    return {
      metric: line.metric,
      displayName: billable?.displayName ?? line.metric,
      totalQuantity: line.totalQuantity,
      includedUnits: line.includedUnits,
      overageQuantity: line.overageQuantity,
      pricePerUnit: line.pricePerUnit,
      charge: line.charge,
    };
  });
}

export function generateInvoicePreview(
  organizationId: Id<string>,
  window: BillingWindow,
  metrics: readonly BillableMetric[],
  usageTotals: ReadonlyMap<UsageMetric, number>,
  baseCharge: bigint,
  isFinal: boolean = false
): InvoicePreview {
  const overage = computeOverages(window, metrics, usageTotals);
  const lineItems = mergeWithDisplayNames(overage.lines, metrics);
  const estimatedTotal = baseCharge + overage.totalCharge;

  return {
    organizationId,
    window,
    baseCharge,
    lineItems,
    totalOverageCharge: overage.totalCharge,
    estimatedTotal,
    generatedAt: epochToIso(Date.now()),
    isFinal,
  };
}
