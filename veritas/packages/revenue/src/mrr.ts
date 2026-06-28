// MRR (Monthly Recurring Revenue) calculation from subscription records.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue, addMoney, zeroMoney, multiplyMoney, fromBaseUnits } from "@veritas/billing";

export interface SubscriptionRecord {
  readonly organizationId: string;
  readonly planId: string;
  readonly status: "active" | "trialing" | "canceled" | "past_due";
  readonly billingInterval: "monthly" | "annual";
  /** Monthly base price in USDC base units. */
  readonly monthlyBaseUnits: bigint;
  readonly startedAt: IsoTimestamp;
  readonly canceledAt: IsoTimestamp | null;
}

export interface MrrSnapshot {
  readonly asOf: IsoTimestamp;
  /** Total MRR across all active subscriptions. */
  readonly total: MoneyValue;
  /** Breakdown by plan id. */
  readonly byPlan: ReadonlyMap<string, MoneyValue>;
  /** Count of active subscriptions. */
  readonly activeCount: number;
}

/** Returns true if the subscription contributes to MRR at the given instant. */
function isActiveAt(sub: SubscriptionRecord, asOf: IsoTimestamp): boolean {
  if (sub.status === "canceled") return false;
  if (sub.status === "past_due") return false;
  const start = new Date(sub.startedAt).getTime();
  const ref = new Date(asOf).getTime();
  if (start > ref) return false;
  if (sub.canceledAt !== null && new Date(sub.canceledAt).getTime() <= ref) return false;
  return true;
}

/** Converts annual billing to a monthly equivalent amount. */
function toMonthlyMrr(sub: SubscriptionRecord): MoneyValue {
  const base = fromBaseUnits(sub.monthlyBaseUnits);
  return sub.billingInterval === "annual"
    ? multiplyMoney(base, 12 / 12) // annual plans already store monthly equivalent
    : base;
}

/** Computes an MRR snapshot for a point-in-time over a list of subscriptions. */
export function computeMrr(
  subscriptions: readonly SubscriptionRecord[],
  asOf: IsoTimestamp
): MrrSnapshot {
  const active = subscriptions.filter((s) => isActiveAt(s, asOf));
  const byPlan = new Map<string, MoneyValue>();

  for (const sub of active) {
    const contribution = toMonthlyMrr(sub);
    const existing = byPlan.get(sub.planId) ?? zeroMoney();
    byPlan.set(sub.planId, addMoney(existing, contribution));
  }

  const total = [...byPlan.values()].reduce(addMoney, zeroMoney());

  return {
    asOf,
    total,
    byPlan: new Map(byPlan),
    activeCount: active.length,
  };
}

/** Computes net MRR change between two snapshots (new minus old). */
export function mrrDelta(previous: MrrSnapshot, current: MrrSnapshot): MoneyValue {
  const prev = previous.total.amount;
  const curr = current.total.amount;
  // Return signed-like value by storing the raw bigint delta; caller interprets sign.
  // Since MoneyValue is non-negative, we return the absolute value and expose a helper.
  const delta = curr >= prev ? curr - prev : prev - curr;
  return fromBaseUnits(delta);
}

/** Returns true when current MRR exceeds previous MRR. */
export function isMrrGrowth(previous: MrrSnapshot, current: MrrSnapshot): boolean {
  return current.total.amount > previous.total.amount;
}

/** Computes MRR growth rate as a fraction (0..N). Returns null if previous is zero. */
export function mrrGrowthRate(previous: MrrSnapshot, current: MrrSnapshot): number | null {
  if (previous.total.amount === 0n) return null;
  return Number(current.total.amount - previous.total.amount) / Number(previous.total.amount);
}
