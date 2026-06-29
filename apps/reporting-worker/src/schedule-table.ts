// In-memory schedule table: tracks due schedules and computes next-run times for the worker.

import type { ReportSchedule, ReportScheduleStore } from "@veritas/reporting";

/** Parse a simple cron field and return an array of matching numeric values. */
function parseCronField(field: string, min: number, max: number): readonly number[] {
  if (field === "*") {
    const result: number[] = [];
    for (let i = min; i <= max; i++) result.push(i);
    return result;
  }
  const values: number[] = [];
  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const slashParts = part.split("/");
      const rangeStr = slashParts[0] ?? "*";
      const step = parseInt(slashParts[1] ?? "1", 10);
      const rangeParts = rangeStr === "*" ? [min, max] : rangeStr.split("-").map(Number);
      const rMin = rangeParts[0] ?? min;
      const rMax = rangeParts[1] ?? max;
      for (let i = rMin; i <= rMax; i += step) values.push(i);
    } else if (part.includes("-")) {
      const dashParts = part.split("-").map(Number);
      const lo = dashParts[0] ?? min;
      const hi = dashParts[1] ?? max;
      for (let i = lo; i <= hi; i++) values.push(i);
    } else {
      values.push(parseInt(part, 10));
    }
  }
  return values.filter((v) => v >= min && v <= max);
}

/** Compute the next UTC run time after `after` for the given 5-field cron expression. */
function computeNextRun(cronExpression: string, after: Date = new Date()): Date {
  const parts = cronExpression.trim().split(/\s+/);
  const minF = parts[0] ?? "*";
  const hourF = parts[1] ?? "*";
  const dowF = parts[4] ?? "*";
  const minutes = parseCronField(minF, 0, 59);
  const hours = parseCronField(hourF, 0, 23);
  const dows = parseCronField(dowF, 0, 6);

  const candidate = new Date(after.getTime() + 60_000); // at least 1 minute ahead
  candidate.setSeconds(0, 0);

  for (let attempt = 0; attempt < 10_080; attempt++) {
    const dow = candidate.getUTCDay();
    const h = candidate.getUTCHours();
    const m = candidate.getUTCMinutes();
    if (dows.includes(dow) && hours.includes(h) && minutes.includes(m)) {
      return candidate;
    }
    candidate.setTime(candidate.getTime() + 60_000);
  }
  // Fallback: 1 week from after
  return new Date(after.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/** Entry stored in the schedule table with bookkeeping metadata. */
export interface ScheduleEntry {
  readonly schedule: ReportSchedule;
  readonly nextRunAt: Date;
  readonly lastCheckedAt: Date;
}

/** Compares a schedule's nextRunAt string to the given reference date. */
function isDue(entry: ScheduleEntry, now: Date): boolean {
  return entry.nextRunAt <= now;
}

/** Build a ScheduleEntry from a ReportSchedule, computing the next run date. */
function toEntry(schedule: ReportSchedule, now: Date): ScheduleEntry {
  const nextRunAt = schedule.nextRunAt
    ? new Date(schedule.nextRunAt)
    : computeNextRun(schedule.cronExpression, now);
  return { schedule, nextRunAt, lastCheckedAt: now };
}

/** In-memory schedule table: loads from store, finds due schedules, advances run times. */
export class ScheduleTable {
  private entries: Map<string, ScheduleEntry> = new Map();

  constructor(private readonly store: ReportScheduleStore) {}

  /** Load all enabled schedules for all known organizations into the in-memory table. */
  async load(organizationIds: readonly string[]): Promise<void> {
    const now = new Date();
    const next = new Map<string, ScheduleEntry>();

    for (const orgId of organizationIds) {
      const result = await this.store.list(orgId);
      if (!result.ok) continue;
      for (const schedule of result.value) {
        if (!schedule.enabled) continue;
        next.set(schedule.id, toEntry(schedule, now));
      }
    }

    this.entries = next;
  }

  /** Return all schedule entries that are due as of now. */
  due(now: Date = new Date()): readonly ScheduleEntry[] {
    return Array.from(this.entries.values()).filter((e) => isDue(e, now));
  }

  /** Advance a schedule's next-run time after a successful run, persisting via store. */
  async advance(scheduleId: string): Promise<void> {
    const entry = this.entries.get(scheduleId);
    if (!entry) return;

    const now = new Date();
    const nextRunAt = computeNextRun(entry.schedule.cronExpression, now);
    const updated = await this.store.update(entry.schedule.id, {
      lastRunAt: now.toISOString(),
      nextRunAt: nextRunAt.toISOString(),
    });

    if (updated.ok) {
      this.entries.set(scheduleId, toEntry(updated.value, now));
    }
  }

  /** Upsert a single schedule (e.g. after an external update). */
  upsert(schedule: ReportSchedule): void {
    if (!schedule.enabled) {
      this.entries.delete(schedule.id);
      return;
    }
    this.entries.set(schedule.id, toEntry(schedule, new Date()));
  }

  /** Remove a schedule from the table by id. */
  remove(scheduleId: string): void {
    this.entries.delete(scheduleId);
  }

  /** Return the number of active schedule entries. */
  get size(): number {
    return this.entries.size;
  }
}
