// Cost forecast: projects future spend from historical cost summaries using linear extrapolation
import type { IsoTimestamp } from "@veritas/core";
import type { CostSummary, AggregationWindow } from "./aggregator.js";

export interface ForecastPoint {
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly projectedUsdc: number;
  readonly confidenceLow: number;
  readonly confidenceHigh: number;
}

export interface TenantForecast {
  readonly tenantId: string;
  readonly feature: string | undefined;
  readonly points: readonly ForecastPoint[];
  readonly averageUsdc: number;
  readonly trendUsdc: number;
}

export interface CostForecast {
  readonly generatedAt: IsoTimestamp;
  readonly horizonPeriods: number;
  readonly periodMs: number;
  readonly forecasts: readonly TenantForecast[];
}

export interface CostForecaster {
  forecast(params: {
    historicalSummaries: readonly CostSummary[];
    horizonPeriods: number;
    periodMs: number;
  }): CostForecast;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0]! };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function groupKey(tenantId: string, feature: string | undefined): string {
  return feature ? `${tenantId}::${feature}` : tenantId;
}

export function createCostForecaster(): CostForecaster {
  function forecast({
    historicalSummaries,
    horizonPeriods,
    periodMs,
  }: {
    historicalSummaries: readonly CostSummary[];
    horizonPeriods: number;
    periodMs: number;
  }): CostForecast {
    // Group summaries by tenant+feature, sorted by periodStart
    const groups = new Map<
      string,
      { tenantId: string; feature: string | undefined; summaries: CostSummary[] }
    >();

    for (const s of historicalSummaries) {
      const key = groupKey(s.tenantId, s.feature);
      const existing = groups.get(key) ?? {
        tenantId: s.tenantId,
        feature: s.feature,
        summaries: [],
      };
      groups.set(key, { ...existing, summaries: [...existing.summaries, s] });
    }

    const forecasts: TenantForecast[] = [];

    for (const group of groups.values()) {
      const sorted = [...group.summaries].sort(
        (a, b) =>
          new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
      );

      const values = sorted.map((s) => s.totalUsdc);
      const average =
        values.length > 0
          ? values.reduce((acc, v) => acc + v, 0) / values.length
          : 0;

      const { slope, intercept } = linearRegression(values);

      const lastPeriodEnd =
        sorted.length > 0
          ? new Date(sorted[sorted.length - 1]!.periodEnd).getTime()
          : Date.now();

      const confidenceMargin = average * 0.15;
      const points: ForecastPoint[] = [];

      for (let i = 1; i <= horizonPeriods; i++) {
        const start = lastPeriodEnd + (i - 1) * periodMs;
        const end = lastPeriodEnd + i * periodMs;
        const idx = values.length + i - 1;
        const projected = Math.max(0, intercept + slope * idx);

        points.push({
          periodStart: new Date(start).toISOString() as IsoTimestamp,
          periodEnd: new Date(end).toISOString() as IsoTimestamp,
          projectedUsdc: projected,
          confidenceLow: Math.max(0, projected - confidenceMargin),
          confidenceHigh: projected + confidenceMargin,
        });
      }

      forecasts.push({
        tenantId: group.tenantId,
        feature: group.feature,
        points,
        averageUsdc: average,
        trendUsdc: slope,
      });
    }

    return {
      generatedAt: new Date().toISOString() as IsoTimestamp,
      horizonPeriods,
      periodMs,
      forecasts,
    };
  }

  return { forecast };
}
