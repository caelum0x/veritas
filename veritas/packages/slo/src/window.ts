// Rolling window utilities: compute time-window boundaries for SLO evaluation.
import { z } from "zod";

export const WindowSchema = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  durationMs: z.number().int().positive(),
});

export type Window = z.infer<typeof WindowSchema>;

/** Build a rolling window ending at `nowMs` with the given duration. */
export function rollingWindow(nowMs: number, durationMs: number): Window {
  return Object.freeze({
    startMs: nowMs - durationMs,
    endMs: nowMs,
    durationMs,
  });
}

/** Slice a window into equal sub-buckets. */
export function sliceWindow(window: Window, bucketCount: number): Window[] {
  const bucketDuration = Math.floor(window.durationMs / bucketCount);
  const buckets: Window[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const startMs = window.startMs + i * bucketDuration;
    const endMs = i === bucketCount - 1 ? window.endMs : startMs + bucketDuration;
    buckets.push(Object.freeze({ startMs, endMs, durationMs: endMs - startMs }));
  }
  return buckets;
}

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Common SLO window presets in milliseconds. */
export const WINDOW_1H = MS_PER_HOUR;
export const WINDOW_6H = 6 * MS_PER_HOUR;
export const WINDOW_24H = MS_PER_DAY;
export const WINDOW_7D = 7 * MS_PER_DAY;
export const WINDOW_30D = 30 * MS_PER_DAY;

/** Check if two windows overlap. */
export function windowsOverlap(a: Window, b: Window): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** Check if window `inner` is fully contained within `outer`. */
export function windowContains(outer: Window, inner: Window): boolean {
  return inner.startMs >= outer.startMs && inner.endMs <= outer.endMs;
}
