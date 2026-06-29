// Revenue forecast using linear regression on historical MRR snapshots.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue, fromBaseUnits, zeroMoney } from "@veritas/billing";
import { MrrSnapshot } from "./mrr.js";

export interface ForecastPoint {
  readonly asOf: IsoTimestamp;
  readonly projected: MoneyValue;
  /** Confidence interval lower bound. */
  readonly low: MoneyValue;
  /** Confidence interval upper bound. */
  readonly high: MoneyValue;
}

export interface RevenueForecast {
  readonly generatedAt: IsoTimestamp;
  readonly horizonMonths: number;
  readonly points: readonly ForecastPoint[];
}

interface RegressionResult {
  readonly slope: number;
  readonly intercept: number;
  readonly stdError: number;
}

function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, stdError: 0 };

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * (ys[i] ?? 0), 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, stdError: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const residuals = ys.map((y, i) => y - (slope * (xs[i] ?? 0) + intercept));
  const sse = residuals.reduce((a, r) => a + r * r, 0);
  const stdError = Math.sqrt(sse / Math.max(n - 2, 1));

  return { slope, intercept, stdError };
}

function addMonths(iso: IsoTimestamp, months: number): IsoTimestamp {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString() as IsoTimestamp;
}

function safeFromUnits(raw: number): MoneyValue {
  const units = BigInt(Math.max(0, Math.round(raw)));
  return fromBaseUnits(units);
}

/**
 * Produces a forward revenue forecast over `horizonMonths` periods
 * using linear regression on the provided MRR history.
 */
export function forecastRevenue(
  history: readonly MrrSnapshot[],
  horizonMonths: number,
  now: IsoTimestamp,
  confidenceZ = 1.645
): RevenueForecast {
  if (history.length === 0) {
    return { generatedAt: now, horizonMonths, points: [] };
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()
  );

  const t0 = new Date(sorted[0]!.asOf).getTime();
  const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;

  const xs = sorted.map((s) => (new Date(s.asOf).getTime() - t0) / msPerMonth);
  const ys = sorted.map((s) => Number(s.total.amount));

  const reg = linearRegression(xs, ys);
  const tNow = (new Date(now).getTime() - t0) / msPerMonth;

  const points: ForecastPoint[] = [];
  for (let m = 1; m <= horizonMonths; m++) {
    const tFuture = tNow + m;
    const projected = reg.slope * tFuture + reg.intercept;
    const margin = confidenceZ * reg.stdError;

    points.push({
      asOf: addMonths(now, m),
      projected: safeFromUnits(projected),
      low: safeFromUnits(projected - margin),
      high: safeFromUnits(projected + margin),
    });
  }

  return { generatedAt: now, horizonMonths, points };
}
