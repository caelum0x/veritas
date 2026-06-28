// Customer Acquisition Cost (CAC) and payback period calculations.

import { MoneyValue, addMoney, zeroMoney, multiplyMoney, fromBaseUnits } from "@veritas/billing";

export interface MarketingSpend {
  /** Epoch milliseconds for the period start. */
  readonly periodStartMs: number;
  /** Epoch milliseconds for the period end (exclusive). */
  readonly periodEndMs: number;
  readonly salesSpend: MoneyValue;
  readonly marketingSpend: MoneyValue;
}

export interface AcquisitionCohort {
  readonly periodStartMs: number;
  readonly periodEndMs: number;
  /** Number of new paying customers acquired in this period. */
  readonly newCustomers: number;
}

export interface CacResult {
  /** Blended CAC across all provided periods. */
  readonly blendedCac: MoneyValue;
  /** Month-by-month CAC entries. */
  readonly byPeriod: ReadonlyArray<{
    readonly periodStartMs: number;
    readonly cac: MoneyValue;
    readonly newCustomers: number;
  }>;
}

export interface PaybackResult {
  /** Number of months to recover CAC at given ARPU and gross margin. */
  readonly paybackMonths: number;
  readonly cac: MoneyValue;
  readonly arpuMonthly: MoneyValue;
}

/** Total spend (sales + marketing) for a single period. */
function totalSpend(spend: MarketingSpend): MoneyValue {
  return addMoney(spend.salesSpend, spend.marketingSpend);
}

/**
 * Computes blended CAC = total spend / total new customers across all periods.
 * Periods without acquisitions are included in spend but excluded from per-period CAC output.
 */
export function computeCac(
  spends: readonly MarketingSpend[],
  cohorts: readonly AcquisitionCohort[]
): CacResult {
  const cohortByPeriod = new Map<number, AcquisitionCohort>(
    cohorts.map((c) => [c.periodStartMs, c])
  );

  let totalSpendSum = zeroMoney();
  let totalCustomers = 0;
  const byPeriod: CacResult["byPeriod"][number][] = [];

  for (const spend of spends) {
    const cohort = cohortByPeriod.get(spend.periodStartMs);
    const customers = cohort?.newCustomers ?? 0;
    const spend_ = totalSpend(spend);
    totalSpendSum = addMoney(totalSpendSum, spend_);
    totalCustomers += customers;

    if (customers > 0) {
      const perCustomer = fromBaseUnits(spend_.amount / BigInt(customers));
      byPeriod.push({
        periodStartMs: spend.periodStartMs,
        cac: perCustomer,
        newCustomers: customers,
      });
    }
  }

  const blendedCac =
    totalCustomers > 0
      ? fromBaseUnits(totalSpendSum.amount / BigInt(totalCustomers))
      : zeroMoney();

  return { blendedCac, byPeriod };
}

/**
 * Computes CAC payback period in months.
 * paybackMonths = CAC / (ARPU × grossMargin)
 */
export function computePayback(
  cac: MoneyValue,
  arpuMonthly: MoneyValue,
  grossMargin = 1
): PaybackResult {
  if (grossMargin <= 0 || grossMargin > 1) {
    throw new RangeError(`grossMargin must be in (0, 1], got ${grossMargin}`);
  }
  if (arpuMonthly.amount === 0n) {
    return { paybackMonths: Infinity, cac, arpuMonthly };
  }

  const adjustedArpu = multiplyMoney(arpuMonthly, grossMargin);
  const paybackMonths =
    Number(cac.amount) / Number(adjustedArpu.amount);

  return { paybackMonths, cac, arpuMonthly };
}
