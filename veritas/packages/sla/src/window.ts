// Measurement window: defines time boundaries for SLA metric evaluation.
import { z } from "zod";

export const WindowKindSchema = z.enum(["rolling", "calendar_day", "calendar_week", "calendar_month"]);
export type WindowKind = z.infer<typeof WindowKindSchema>;

export const MeasurementWindowSchema = z.object({
  kind: WindowKindSchema,
  /** Duration in seconds (used for rolling windows). */
  durationSeconds: z.number().int().positive().optional(),
  /** ISO timestamp marking the start of this window instance. */
  startsAt: z.string(),
  /** ISO timestamp marking the end of this window instance. */
  endsAt: z.string(),
});
export type MeasurementWindow = z.infer<typeof MeasurementWindowSchema>;

/** Build a rolling window ending at `now` with the given duration. */
export function rollingWindow(durationSeconds: number, now: string = new Date().toISOString()): MeasurementWindow {
  const endMs = new Date(now).getTime();
  const startMs = endMs - durationSeconds * 1000;
  return {
    kind: "rolling",
    durationSeconds,
    startsAt: new Date(startMs).toISOString(),
    endsAt: now,
  };
}

/** Build a calendar-day window for the UTC day containing `now`. */
export function calendarDayWindow(now: string = new Date().toISOString()): MeasurementWindow {
  const d = new Date(now);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start.getTime() + 86_400_000);
  return {
    kind: "calendar_day",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

/** Build a calendar-month window for the UTC month containing `now`. */
export function calendarMonthWindow(now: string = new Date().toISOString()): MeasurementWindow {
  const d = new Date(now);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return {
    kind: "calendar_month",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

/** Returns true if the given ISO timestamp falls within the window (inclusive start, exclusive end). */
export function isWithinWindow(window: MeasurementWindow, timestamp: string): boolean {
  return timestamp >= window.startsAt && timestamp < window.endsAt;
}

/** Fraction of the window that has elapsed at `now` (clamped 0–1). */
export function windowProgress(window: MeasurementWindow, now: string = new Date().toISOString()): number {
  const totalMs = new Date(window.endsAt).getTime() - new Date(window.startsAt).getTime();
  if (totalMs <= 0) return 1;
  const elapsedMs = new Date(now).getTime() - new Date(window.startsAt).getTime();
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}
