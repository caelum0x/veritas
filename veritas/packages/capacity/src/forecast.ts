// Demand forecast using simple linear regression over utilization time-series.
import { Result, ok, err } from "@veritas/core";
import { UtilizationPoint, TrendDirection } from "./types.js";
import { ForecastError, InsufficientDataError } from "./errors.js";

export interface ForecastPoint {
  readonly resourceName: string;
  readonly horizonMs: number;
  readonly predictedRatio: number;
  readonly trend: TrendDirection;
  readonly confidenceInterval: readonly [number, number];
}

/** Minimum samples required to produce a forecast. */
const MIN_SAMPLES = 3;

/** Fit a simple linear regression: returns { slope, intercept } for x→ratio. */
function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((acc, x, i) => acc + (x - meanX) * ((ys[i] ?? 0) - meanY), 0);
  const den = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

function classifyTrend(slope: number): TrendDirection {
  if (slope > 1e-6) return "increasing";
  if (slope < -1e-6) return "decreasing";
  return "stable";
}

/**
 * Forecast utilization for each resource `horizonMs` milliseconds into the future.
 * Points must be sorted in ascending timestamp order.
 */
export function forecastUtilization(
  points: UtilizationPoint[],
  horizonMs: number,
  ciMultiplier = 1.96
): Result<ForecastPoint[], ForecastError | InsufficientDataError> {
  if (points.length < MIN_SAMPLES) {
    return err(new InsufficientDataError(`Need at least ${MIN_SAMPLES} samples for forecast`));
  }
  if (horizonMs <= 0) {
    return err(new ForecastError("horizonMs must be positive"));
  }

  // Group by resource
  const byResource = new Map<string, UtilizationPoint[]>();
  for (const p of points) {
    const arr = byResource.get(p.resourceName) ?? [];
    arr.push(p);
    byResource.set(p.resourceName, arr);
  }

  const results: ForecastPoint[] = [];

  for (const [resourceName, pts] of byResource) {
    if (pts.length < MIN_SAMPLES) continue;

    const t0 = new Date(pts[0]!.timestampIso).getTime();
    const xs = pts.map((p) => new Date(p.timestampIso).getTime() - t0);
    const ys = pts.map((p) => p.ratio);

    const { slope, intercept } = linearFit(xs, ys);
    const futureX = xs[xs.length - 1]! + horizonMs;
    const predicted = Math.max(0, slope * futureX + intercept);

    // Compute residual std-dev for confidence interval
    const residuals = xs.map((x, i) => (ys[i] ?? 0) - (slope * x + intercept));
    const variance =
      residuals.reduce((acc, r) => acc + r ** 2, 0) / Math.max(1, xs.length - 2);
    const stdErr = Math.sqrt(variance);
    const margin = ciMultiplier * stdErr;

    results.push({
      resourceName,
      horizonMs,
      predictedRatio: predicted,
      trend: classifyTrend(slope),
      confidenceInterval: [Math.max(0, predicted - margin), predicted + margin],
    });
  }

  if (results.length === 0) {
    return err(new InsufficientDataError("No resource had sufficient samples for forecast"));
  }

  return ok(results);
}
