// Timing helpers for recording operation durations into Histogram metrics.

import { Histogram, Labels } from "./metric.js";

/** A started timer that can be stopped to record elapsed time. */
export interface Timer {
  /** Stop the timer and record elapsed milliseconds into the histogram. */
  stop(labels?: Labels): number;
}

/**
 * Start a high-resolution timer against a Histogram.
 * Returns a Timer whose stop() records the elapsed ms and returns it.
 */
export function startTimer(histogram: Histogram, baseLabels?: Labels): Timer {
  const startNs = process.hrtime.bigint();
  return {
    stop(extraLabels?: Labels): number {
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      const labels: Labels = { ...baseLabels, ...extraLabels };
      histogram.observe(elapsedMs, labels);
      return elapsedMs;
    },
  };
}

/**
 * Time an async function and record the duration into a Histogram.
 * Re-throws any errors after recording.
 */
export async function timeAsync<T>(
  histogram: Histogram,
  fn: () => Promise<T>,
  labels?: Labels
): Promise<T> {
  const timer = startTimer(histogram, labels);
  try {
    const result = await fn();
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    throw error;
  }
}

/**
 * Time a synchronous function and record the duration into a Histogram.
 * Re-throws any errors after recording.
 */
export function timeSync<T>(
  histogram: Histogram,
  fn: () => T,
  labels?: Labels
): T {
  const timer = startTimer(histogram, labels);
  try {
    const result = fn();
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    throw error;
  }
}

/**
 * Create a reusable timing wrapper that always records into the same histogram
 * with the same base labels.
 */
export function createTimer(
  histogram: Histogram,
  baseLabels?: Labels
): {
  start(): Timer;
  timeAsync<T>(fn: () => Promise<T>, extraLabels?: Labels): Promise<T>;
  timeSync<T>(fn: () => T, extraLabels?: Labels): T;
} {
  return {
    start(): Timer {
      return startTimer(histogram, baseLabels);
    },
    timeAsync<T>(fn: () => Promise<T>, extraLabels?: Labels): Promise<T> {
      return timeAsync(histogram, fn, { ...baseLabels, ...extraLabels });
    },
    timeSync<T>(fn: () => T, extraLabels?: Labels): T {
      return timeSync(histogram, fn, { ...baseLabels, ...extraLabels });
    },
  };
}
