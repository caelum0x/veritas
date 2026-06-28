// Revenue recognition: allocates subscription payments to earned revenue per accounting period.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue, fromBaseUnits, multiplyMoney, zeroMoney, addMoney } from "@veritas/billing";

export interface RecognitionSchedule {
  readonly subscriptionId: string;
  readonly organizationId: string;
  /** Total contract value in base units. */
  readonly totalContractUnits: bigint;
  /** Service start date. */
  readonly serviceStartAt: IsoTimestamp;
  /** Service end date (exclusive). */
  readonly serviceEndAt: IsoTimestamp;
  readonly billingInterval: "monthly" | "annual";
}

export interface RecognizedPeriod {
  /** ISO month label, e.g. "2024-01". */
  readonly month: string;
  readonly earnedRevenue: MoneyValue;
  readonly deferredRevenue: MoneyValue;
}

export interface RecognitionResult {
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly totalContractValue: MoneyValue;
  readonly periods: readonly RecognizedPeriod[];
}

function toYearMonth(ts: IsoTimestamp): string {
  return ts.slice(0, 7);
}

function monthsBetween(startAt: IsoTimestamp, endAt: IsoTimestamp): number {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny.toString().padStart(4, "0")}-${nm.toString().padStart(2, "0")}`;
}

/**
 * Recognizes revenue for a subscription across its service period.
 * For monthly plans: each month's payment is fully earned in that month.
 * For annual plans: revenue is spread evenly across 12 months.
 */
export function recognizeRevenue(schedule: RecognitionSchedule): RecognitionResult {
  const totalContractValue = fromBaseUnits(schedule.totalContractUnits);
  const startMonth = toYearMonth(schedule.serviceStartAt);

  if (schedule.billingInterval === "monthly") {
    // Each monthly payment is recognized entirely in the billing month.
    const period: RecognizedPeriod = {
      month: startMonth,
      earnedRevenue: totalContractValue,
      deferredRevenue: zeroMoney(),
    };
    return {
      subscriptionId: schedule.subscriptionId,
      organizationId: schedule.organizationId,
      totalContractValue,
      periods: [period],
    };
  }

  // Annual plan: spread across 12 months.
  const totalMonths = Math.max(
    monthsBetween(schedule.serviceStartAt, schedule.serviceEndAt),
    1
  );
  const perMonthUnits = schedule.totalContractUnits / BigInt(totalMonths);
  const remainder = schedule.totalContractUnits % BigInt(totalMonths);

  const periods: RecognizedPeriod[] = [];
  let cumulativeEarned = 0n;

  for (let i = 0; i < totalMonths; i++) {
    const month = addMonths(startMonth, i);
    // Distribute remainder to first month.
    const thisMonthUnits = i === 0 ? perMonthUnits + remainder : perMonthUnits;
    cumulativeEarned += thisMonthUnits;
    const deferred = schedule.totalContractUnits - cumulativeEarned;
    periods.push({
      month,
      earnedRevenue: fromBaseUnits(thisMonthUnits),
      deferredRevenue: fromBaseUnits(deferred),
    });
  }

  return {
    subscriptionId: schedule.subscriptionId,
    organizationId: schedule.organizationId,
    totalContractValue,
    periods,
  };
}

/** Sums recognized (earned) revenue across multiple results for a given month. */
export function totalEarnedForMonth(
  results: readonly RecognitionResult[],
  month: string
): MoneyValue {
  return results.reduce((acc, r) => {
    const period = r.periods.find((p) => p.month === month);
    return period ? addMoney(acc, period.earnedRevenue) : acc;
  }, zeroMoney());
}

/** Sums deferred revenue across multiple results for a given month. */
export function totalDeferredForMonth(
  results: readonly RecognitionResult[],
  month: string
): MoneyValue {
  return results.reduce((acc, r) => {
    const period = r.periods.find((p) => p.month === month);
    return period ? addMoney(acc, period.deferredRevenue) : acc;
  }, zeroMoney());
}
