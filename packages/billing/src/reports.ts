// Billing summary reports: aggregate usage, charges, and plan info into period summaries.

import { Id, IsoTimestamp, epochToIso, isoToEpoch } from "@veritas/core";
import { type PeriodUsage } from "./usage-aggregator.js";
import { type MoneyValue, addMoney, zeroMoney, formatMoney } from "./money.js";
import { type Plan, getLimitForMetric } from "./plans.js";
import { type UsageMetric } from "./metering.js";

export interface LineItemReport {
  readonly metric: UsageMetric;
  readonly includedUnits: number;
  readonly billedUnits: number;
  readonly totalQuantity: number;
  readonly unitPrice: MoneyValue;
  readonly subtotal: MoneyValue;
}

export interface BillingSummaryReport {
  readonly organizationId: Id<string>;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly planId: string;
  readonly planName: string;
  readonly baseCharge: MoneyValue;
  readonly lineItems: readonly LineItemReport[];
  readonly overageTotal: MoneyValue;
  readonly grandTotal: MoneyValue;
  readonly generatedAt: IsoTimestamp;
}

export interface ReportOptions {
  readonly unitPrices?: Partial<Record<UsageMetric, MoneyValue>>;
}

export function buildBillingSummaryReport(
  organizationId: Id<string>,
  plan: Plan,
  periodUsage: readonly PeriodUsage[],
  periodStart: IsoTimestamp,
  periodEnd: IsoTimestamp,
  opts: ReportOptions = {}
): BillingSummaryReport {
  const baseCharge: MoneyValue = { amount: plan.basePrice, currency: "USDC" };

  const lineItems: LineItemReport[] = periodUsage.map((pu) => {
    const limit = getLimitForMetric(plan, pu.metric);
    const includedUnits = limit?.includedUnits ?? 0;
    const billedUnits = Math.max(0, pu.totalQuantity - includedUnits);
    const unitPrice: MoneyValue =
      opts.unitPrices?.[pu.metric] ?? { amount: 0n, currency: "USDC" };
    const subtotal: MoneyValue = {
      amount: BigInt(Math.round(billedUnits * Number(unitPrice.amount))),
      currency: "USDC",
    };
    return {
      metric: pu.metric,
      includedUnits,
      billedUnits,
      totalQuantity: pu.totalQuantity,
      unitPrice,
      subtotal,
    };
  });

  const overageTotal = lineItems.reduce(
    (acc, li) => addMoney(acc, li.subtotal),
    zeroMoney()
  );
  const grandTotal = addMoney(baseCharge, overageTotal);

  return {
    organizationId,
    periodStart,
    periodEnd,
    planId: plan.id,
    planName: plan.name,
    baseCharge,
    lineItems,
    overageTotal,
    grandTotal,
    generatedAt: epochToIso(Date.now()),
  };
}

export interface ReportSummaryLine {
  readonly label: string;
  readonly value: string;
}

export function formatBillingSummaryReport(
  report: BillingSummaryReport
): ReportSummaryLine[] {
  const lines: ReportSummaryLine[] = [
    { label: "Organization", value: report.organizationId },
    { label: "Plan", value: `${report.planName} (${report.planId})` },
    { label: "Period", value: `${report.periodStart} → ${report.periodEnd}` },
    { label: "Base Charge", value: formatMoney(report.baseCharge) },
  ];

  for (const li of report.lineItems) {
    lines.push({
      label: `  ${li.metric}`,
      value: `${li.totalQuantity} total, ${li.billedUnits} billed @ ${formatMoney(li.unitPrice)} = ${formatMoney(li.subtotal)}`,
    });
  }

  lines.push(
    { label: "Overage Total", value: formatMoney(report.overageTotal) },
    { label: "Grand Total", value: formatMoney(report.grandTotal) },
    { label: "Generated At", value: report.generatedAt }
  );

  return lines;
}

export function filterReportsByPeriod(
  reports: readonly BillingSummaryReport[],
  from: IsoTimestamp,
  to: IsoTimestamp
): BillingSummaryReport[] {
  const fromMs = isoToEpoch(from) ?? 0;
  const toMs = isoToEpoch(to) ?? Infinity;
  return reports.filter((r) => {
    const periodStartMs = isoToEpoch(r.periodStart);
    return periodStartMs !== null && periodStartMs >= fromMs && periodStartMs < toMs;
  });
}
