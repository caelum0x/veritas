// Predictive scaling: forecast future load via simple linear regression over a sliding window
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import { InsufficientDataError } from "./errors.js";

export const DataPointSchema = z.object({
  timestamp: z.number(), // unix ms
  value: z.number().nonnegative(),
});
export type DataPoint = z.infer<typeof DataPointSchema>;

export const PredictorConfigSchema = z.object({
  windowMs: z.number().positive().default(300_000),   // 5 min default
  horizonMs: z.number().positive().default(60_000),   // 1 min ahead default
  minPoints: z.number().int().min(2).default(3),
});
export type PredictorConfig = z.infer<typeof PredictorConfigSchema>;

export interface Predictor {
  record(point: DataPoint): void;
  forecast(nowMs: number): Result<number, InsufficientDataError>;
  reset(): void;
}

/** Linear-regression predictor over a sliding time window */
export function makePredictor(cfg: Partial<PredictorConfig> = {}): Predictor {
  const config = PredictorConfigSchema.parse(cfg);
  let history: DataPoint[] = [];

  function prune(nowMs: number): void {
    const cutoff = nowMs - config.windowMs;
    history = history.filter((p) => p.timestamp >= cutoff);
  }

  function linearRegression(
    points: DataPoint[]
  ): { slope: number; intercept: number } {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.timestamp, 0);
    const sumY = points.reduce((s, p) => s + p.value, 0);
    const sumXY = points.reduce((s, p) => s + p.timestamp * p.value, 0);
    const sumX2 = points.reduce((s, p) => s + p.timestamp * p.timestamp, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  return {
    record(point: DataPoint): void {
      history = [...history, DataPointSchema.parse(point)];
    },

    forecast(nowMs: number): Result<number, InsufficientDataError> {
      prune(nowMs);
      if (history.length < config.minPoints) {
        return err(
          new InsufficientDataError(
            `Need at least ${config.minPoints} data points; have ${history.length}`
          )
        );
      }
      const { slope, intercept } = linearRegression(history);
      const targetT = nowMs + config.horizonMs;
      const predicted = slope * targetT + intercept;
      return ok(Math.max(0, predicted));
    },

    reset(): void {
      history = [];
    },
  };
}
