// Revenue cohort analysis: groups subscriptions by start month and tracks retention.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue, addMoney, zeroMoney, fromBaseUnits } from "@veritas/billing";
import { SubscriptionRecord } from "./mrr.js";

export interface CohortMonth {
  /** ISO month label, e.g. "2024-01". */
  readonly month: string;
  readonly subscriptionCount: number;
  readonly mrr: MoneyValue;
}

export interface Cohort {
  /** The month this cohort started, e.g. "2024-01". */
  readonly cohortMonth: string;
  readonly initialCount: number;
  readonly initialMrr: MoneyValue;
  /** Retention data per subsequent month offset (0 = cohort month). */
  readonly retention: readonly CohortMonth[];
}

export interface CohortAnalysis {
  readonly cohorts: readonly Cohort[];
  readonly generatedAt: IsoTimestamp;
}

function toYearMonth(ts: IsoTimestamp): string {
  return ts.slice(0, 7); // "YYYY-MM"
}

function monthsInRange(startMonth: string, endMonth: string): readonly string[] {
  const months: string[] = [];
  const [sy, sm] = startMonth.split("-").map(Number) as [number, number];
  const [ey, em] = endMonth.split("-").map(Number) as [number, number];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function isActiveInMonth(sub: SubscriptionRecord, month: string): boolean {
  const subStart = toYearMonth(sub.startedAt);
  if (subStart > month) return false;
  if (sub.canceledAt !== null && toYearMonth(sub.canceledAt) < month) return false;
  if (sub.status === "canceled" && sub.canceledAt !== null) {
    return toYearMonth(sub.canceledAt) >= month;
  }
  return sub.status === "active" || sub.status === "trialing";
}

function mrrForSubs(subs: readonly SubscriptionRecord[]): MoneyValue {
  return subs.reduce(
    (acc, s) => addMoney(acc, fromBaseUnits(s.monthlyBaseUnits)),
    zeroMoney()
  );
}

/** Builds a cohort analysis grouping subscriptions by their start month. */
export function buildCohortAnalysis(
  subscriptions: readonly SubscriptionRecord[],
  endMonth: string,
  generatedAt: IsoTimestamp
): CohortAnalysis {
  const byCohort = new Map<string, SubscriptionRecord[]>();

  for (const sub of subscriptions) {
    const cohortMonth = toYearMonth(sub.startedAt);
    const existing = byCohort.get(cohortMonth) ?? [];
    byCohort.set(cohortMonth, [...existing, sub]);
  }

  const sortedCohortMonths = [...byCohort.keys()].sort();

  const cohorts: Cohort[] = sortedCohortMonths.map((cohortMonth) => {
    const cohortSubs = byCohort.get(cohortMonth) ?? [];
    const initialMrr = mrrForSubs(cohortSubs);
    const months = monthsInRange(cohortMonth, endMonth);

    const retention: CohortMonth[] = months.map((month) => {
      const activeSubs = cohortSubs.filter((s) => isActiveInMonth(s, month));
      return {
        month,
        subscriptionCount: activeSubs.length,
        mrr: mrrForSubs(activeSubs),
      };
    });

    return {
      cohortMonth,
      initialCount: cohortSubs.length,
      initialMrr,
      retention,
    };
  });

  return { cohorts, generatedAt };
}

/** Returns the retention rate (0..1) for a cohort at a given month offset. */
export function retentionRate(cohort: Cohort, offsetMonths: number): number {
  if (cohort.initialCount === 0) return 0;
  const month = cohort.retention[offsetMonths];
  if (month === undefined) return 0;
  return month.subscriptionCount / cohort.initialCount;
}
