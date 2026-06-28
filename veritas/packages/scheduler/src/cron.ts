// Cron expression parser: validates and computes next-run timestamps from cron strings.
import { AppError } from "@veritas/core";

export interface CronFields {
  readonly minute: ReadonlyArray<number>;
  readonly hour: ReadonlyArray<number>;
  readonly dayOfMonth: ReadonlyArray<number>;
  readonly month: ReadonlyArray<number>;
  readonly dayOfWeek: ReadonlyArray<number>;
}

const FIELD_RANGES: ReadonlyArray<{ min: number; max: number }> = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // dayOfMonth
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 },  // dayOfWeek
];

function validationError(message: string): AppError {
  return new AppError("VALIDATION", 400, message);
}

function parseField(expr: string, min: number, max: number): ReadonlyArray<number> {
  if (expr === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  const values: number[] = [];
  for (const part of expr.split(",")) {
    if (part.includes("/")) {
      const slashIdx = part.indexOf("/");
      const rangeStr = part.slice(0, slashIdx);
      const stepStr = part.slice(slashIdx + 1);
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step < 1) throw validationError(`Invalid step in cron field: ${part}`);
      let rangeMin: number;
      let rangeMax: number;
      if (rangeStr === "*") {
        rangeMin = min;
        rangeMax = max;
      } else {
        const dashIdx = rangeStr.indexOf("-");
        if (dashIdx === -1) {
          rangeMin = parseInt(rangeStr, 10);
          rangeMax = rangeMin;
        } else {
          rangeMin = parseInt(rangeStr.slice(0, dashIdx), 10);
          rangeMax = parseInt(rangeStr.slice(dashIdx + 1), 10);
        }
      }
      if (isNaN(rangeMin) || isNaN(rangeMax)) throw validationError(`Invalid range in cron field: ${part}`);
      for (let i = rangeMin; i <= rangeMax; i += step) values.push(i);
    } else if (part.includes("-")) {
      const dashIdx = part.indexOf("-");
      const lo = parseInt(part.slice(0, dashIdx), 10);
      const hi = parseInt(part.slice(dashIdx + 1), 10);
      if (isNaN(lo) || isNaN(hi)) throw validationError(`Invalid range in cron field: ${part}`);
      for (let i = lo; i <= hi; i++) values.push(i);
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n)) throw validationError(`Invalid value in cron field: ${part}`);
      values.push(n);
    }
  }
  const unique = [...new Set(values)].sort((a, b) => a - b);
  for (const v of unique) {
    if (v < min || v > max) throw validationError(`Cron value ${v} out of range [${min},${max}]`);
  }
  return unique;
}

export function parseCron(expr: string): CronFields {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new AppError("VALIDATION", 400, `Cron expression must have 5 fields: "${expr}"`);
  const parsed = parts.map((p, i) => {
    const range = FIELD_RANGES[i];
    if (range === undefined) throw new AppError("INTERNAL", 500, `Unexpected field index: ${i}`);
    return parseField(p, range.min, range.max);
  });
  const minute = parsed[0];
  const hour = parsed[1];
  const dayOfMonth = parsed[2];
  const month = parsed[3];
  const dayOfWeek = parsed[4];
  if (
    minute === undefined ||
    hour === undefined ||
    dayOfMonth === undefined ||
    month === undefined ||
    dayOfWeek === undefined
  ) {
    throw new AppError("INTERNAL", 500, "Failed to parse cron fields");
  }
  return { minute, hour, dayOfMonth, month, dayOfWeek };
}

export function nextCronDate(fields: CronFields, after: Date): Date {
  const start = new Date(after.getTime() + 60_000);
  start.setSeconds(0, 0);
  const limit = new Date(start.getTime() + 366 * 24 * 60 * 60 * 1000);
  const candidate = new Date(start);
  while (candidate < limit) {
    const m = candidate.getMonth() + 1;
    if (!fields.month.includes(m)) {
      candidate.setMonth(candidate.getMonth() + 1, 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    const dom = candidate.getDate();
    const dow = candidate.getDay();
    if (!fields.dayOfMonth.includes(dom) || !fields.dayOfWeek.includes(dow)) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    const h = candidate.getHours();
    if (!fields.hour.includes(h)) {
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
      continue;
    }
    const min = candidate.getMinutes();
    const nextMin = fields.minute.find((v) => v >= min);
    if (nextMin === undefined) {
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
      continue;
    }
    candidate.setMinutes(nextMin, 0, 0);
    return new Date(candidate);
  }
  throw new AppError("INTERNAL", 500, `No next cron date found within 1 year for expression`);
}

export function isCronExpression(expr: string): boolean {
  try {
    parseCron(expr);
    return true;
  } catch {
    return false;
  }
}
