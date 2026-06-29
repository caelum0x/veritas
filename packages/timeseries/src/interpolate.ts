// Gap interpolation strategies for timeseries data points
import type { DataPoint } from "./point.js";

export type InterpolationStrategy = "linear" | "step" | "none";

/** Fill gaps in a sorted point array at evenly-spaced intervals using the chosen strategy */
export function interpolate(
  points: readonly DataPoint[],
  intervalMs: number,
  strategy: InterpolationStrategy,
): readonly DataPoint[] {
  if (points.length < 2 || strategy === "none") return points;

  const filled: DataPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const cur = points[i]!;
    const next = points[i + 1]!;
    filled.push(cur);

    const gap = next.timestamp - cur.timestamp;
    if (gap <= intervalMs) continue;

    const steps = Math.floor(gap / intervalMs);
    for (let s = 1; s < steps; s++) {
      const ts = cur.timestamp + s * intervalMs;
      const value = strategy === "linear"
        ? linearInterp(cur.value, next.value, s / steps)
        : cur.value; // step: carry last value forward
      filled.push({ timestamp: ts, value });
    }
  }
  filled.push(points[points.length - 1]!);
  return filled;
}

function linearInterp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Fill a single gap between two known points at a target timestamp */
export function interpolateAt(
  before: DataPoint,
  after: DataPoint,
  targetTs: number,
  strategy: InterpolationStrategy,
): DataPoint {
  if (strategy === "linear") {
    const t = (targetTs - before.timestamp) / (after.timestamp - before.timestamp);
    return { timestamp: targetTs, value: linearInterp(before.value, after.value, t) };
  }
  // step or none: use before value
  return { timestamp: targetTs, value: before.value };
}
