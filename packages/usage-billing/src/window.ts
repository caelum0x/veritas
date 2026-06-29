// window.ts: billing window (period) definition and utilities for cycle computation.

import { IsoTimestamp, isoToEpoch, epochToIso } from "@veritas/core";
import { z } from "zod";

export const BillingIntervalSchema = z.enum(["monthly", "annual", "weekly", "daily"]);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export interface BillingWindow {
  readonly start: IsoTimestamp;
  readonly end: IsoTimestamp;
  readonly interval: BillingInterval;
}

export function windowForDate(
  anchorDate: IsoTimestamp,
  interval: BillingInterval
): BillingWindow {
  const anchorMs = isoToEpoch(anchorDate) ?? Date.now();
  const d = new Date(anchorMs);

  let start: Date;
  let end: Date;

  switch (interval) {
    case "daily": {
      start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    }
    case "weekly": {
      const dayOfWeek = d.getUTCDay();
      start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOfWeek));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      break;
    }
    case "monthly": {
      start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      break;
    }
    case "annual": {
      start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      end = new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1));
      break;
    }
  }

  return {
    start: epochToIso(start.getTime()),
    end: epochToIso(end.getTime()),
    interval,
  };
}

export function nextWindow(window: BillingWindow): BillingWindow {
  return windowForDate(window.end, window.interval);
}

export function isInWindow(window: BillingWindow, ts: IsoTimestamp): boolean {
  const tsMs = isoToEpoch(ts);
  if (tsMs === null) return false;
  const startMs = isoToEpoch(window.start) ?? 0;
  const endMs = isoToEpoch(window.end) ?? 0;
  return tsMs >= startMs && tsMs < endMs;
}

export function windowDurationMs(window: BillingWindow): number {
  const startMs = isoToEpoch(window.start) ?? 0;
  const endMs = isoToEpoch(window.end) ?? 0;
  return endMs - startMs;
}
