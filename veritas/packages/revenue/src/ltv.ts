// Customer Lifetime Value (LTV) calculation from ARPU and churn metrics.

import { MoneyValue, fromBaseUnits, multiplyMoney, zeroMoney } from "@veritas/billing";
import { MrrSnapshot } from "./mrr.js";

export interface LtvInputs {
  /** Average Revenue Per User/Org per month in base units. */
  readonly arpuMonthly: MoneyValue;
  /** Monthly churn rate as a fraction (0..1). */
  readonly monthlyChurnRate: number;
  /** Optional gross margin fraction (0..1). Defaults to 1 (no COGS adjustment). */
  readonly grossMargin?: number;
}

export interface LtvResult {
  /** Predicted customer lifetime in months. */
  readonly lifetimeMonths: number;
  /** Raw LTV (ARPU × lifetime). */
  readonly ltv: MoneyValue;
  /** Gross-margin-adjusted LTV. */
  readonly adjustedLtv: MoneyValue;
  /** LTV / CAC ratio (populated by caller if CAC is known). */
  readonly ltvToCacRatio: number | null;
}

/**
 * Computes LTV using the simple formula: LTV = ARPU / churnRate.
 * Gross margin adjustment is applied when provided.
 */
export function computeLtv(inputs: LtvInputs, cacPerCustomer?: MoneyValue): LtvResult {
  const { arpuMonthly, monthlyChurnRate, grossMargin = 1 } = inputs;

  if (monthlyChurnRate <= 0 || monthlyChurnRate > 1) {
    throw new RangeError(
      `monthlyChurnRate must be in (0, 1], got ${monthlyChurnRate}`
    );
  }

  const lifetimeMonths = 1 / monthlyChurnRate;
  const ltv = multiplyMoney(arpuMonthly, lifetimeMonths);
  const adjustedLtv = multiplyMoney(ltv, Math.min(1, Math.max(0, grossMargin)));

  const ltvToCacRatio =
    cacPerCustomer && cacPerCustomer.amount > 0n
      ? Number(adjustedLtv.amount) / Number(cacPerCustomer.amount)
      : null;

  return { lifetimeMonths, ltv, adjustedLtv, ltvToCacRatio };
}

/**
 * Derives ARPU from an MRR snapshot and a known active customer count.
 * Returns zero-money when activeCount is 0.
 */
export function arpuFromSnapshot(
  snapshot: MrrSnapshot,
  activeCount: number
): MoneyValue {
  if (activeCount <= 0) return zeroMoney();
  const perCustomer = snapshot.total.amount / BigInt(activeCount);
  return fromBaseUnits(perCustomer);
}
