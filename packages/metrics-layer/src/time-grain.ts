// Time grain: temporal truncation unit for metric queries with SQL helpers and ordering.
import { z } from "zod";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { InvalidTimeGrainError } from "./errors.js";

export const TimeGrainSchema = z.enum(["minute", "hour", "day", "week", "month", "quarter", "year"]);
export type TimeGrain = z.infer<typeof TimeGrainSchema>;

/** Milliseconds per grain unit (approximate; months/quarters/years use averages) */
export const GRAIN_MS: Readonly<Record<TimeGrain, number>> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  quarter: 7_776_000_000,
  year: 31_536_000_000,
};

/** SQL date-trunc format strings for each grain */
export const GRAIN_DATE_TRUNC: Readonly<Record<TimeGrain, string>> = {
  minute: "minute",
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

/** All supported time grains in ascending duration order. */
export const ALL_TIME_GRAINS: readonly TimeGrain[] = [
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
];

/** Return true if coarseGrain >= fineGrain in temporal resolution */
export function isCoarserOrEqual(coarseGrain: TimeGrain, fineGrain: TimeGrain): boolean {
  return GRAIN_MS[coarseGrain] >= GRAIN_MS[fineGrain];
}

/** Emit the SQL DATE_TRUNC expression for the given grain and column identifier. */
export function toSqlTrunc(grain: TimeGrain, col: string): string {
  return `DATE_TRUNC('${GRAIN_DATE_TRUNC[grain]}', ${col})`;
}

/** Safely parse an unknown value into a TimeGrain, returning a Result. */
export function parseTimeGrain(raw: unknown): Result<TimeGrain, InvalidTimeGrainError> {
  const parsed = TimeGrainSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new InvalidTimeGrainError(String(raw)));
  }
  return ok(parsed.data);
}
