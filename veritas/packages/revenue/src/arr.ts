// ARR (Annual Recurring Revenue) calculation derived from MRR snapshots.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue, multiplyMoney, fromBaseUnits } from "@veritas/billing";
import { MrrSnapshot, computeMrr, SubscriptionRecord } from "./mrr.js";

export interface ArrSnapshot {
  readonly asOf: IsoTimestamp;
  /** ARR = MRR * 12 */
  readonly total: MoneyValue;
  /** Underlying MRR value. */
  readonly mrr: MoneyValue;
  /** Breakdown by plan id (ARR per plan). */
  readonly byPlan: ReadonlyMap<string, MoneyValue>;
  readonly activeCount: number;
}

/** Converts an MRR snapshot to an ARR snapshot by multiplying by 12. */
export function mrrToArr(mrr: MrrSnapshot): ArrSnapshot {
  const total = multiplyMoney(mrr.total, 12);

  const byPlan = new Map<string, MoneyValue>();
  for (const [planId, mrrValue] of mrr.byPlan) {
    byPlan.set(planId, multiplyMoney(mrrValue, 12));
  }

  return {
    asOf: mrr.asOf,
    total,
    mrr: mrr.total,
    byPlan: new Map(byPlan),
    activeCount: mrr.activeCount,
  };
}

/** Computes ARR directly from a subscription list at a point in time. */
export function computeArr(
  subscriptions: readonly SubscriptionRecord[],
  asOf: IsoTimestamp
): ArrSnapshot {
  const mrr = computeMrr(subscriptions, asOf);
  return mrrToArr(mrr);
}

/** Returns ARR growth rate as a fraction. Returns null when previous ARR is zero. */
export function arrGrowthRate(previous: ArrSnapshot, current: ArrSnapshot): number | null {
  if (previous.total.amount === 0n) return null;
  return Number(current.total.amount - previous.total.amount) / Number(previous.total.amount);
}

/** Computes net ARR delta magnitude between two snapshots. */
export function arrDelta(previous: ArrSnapshot, current: ArrSnapshot): MoneyValue {
  const delta =
    current.total.amount >= previous.total.amount
      ? current.total.amount - previous.total.amount
      : previous.total.amount - current.total.amount;
  return fromBaseUnits(delta);
}

/** Returns true when current ARR exceeds previous. */
export function isArrGrowth(previous: ArrSnapshot, current: ArrSnapshot): boolean {
  return current.total.amount > previous.total.amount;
}
