// Cron schedule table: maps job names to their cron expressions and default payloads.
import { type CreateScheduledJob } from "@veritas/scheduler";

/** A single entry in the schedule table, combining an id with job definition fields. */
export type ScheduleTableEntry = CreateScheduledJob & { readonly id: string };

/** Central ordered list of all recurring scheduled jobs for this app. */
export const SCHEDULE_TABLE: ReadonlyArray<ScheduleTableEntry> = [
  {
    id: "expire-orders",
    name: "expire-orders",
    schedule: { kind: "cron", expression: "*/15 * * * *" }, // every 15 minutes
    payload: { maxAgeMs: 3_600_000, batchSize: 100 },
    maxRetries: 3,
  },
  {
    id: "rollup-usage",
    name: "rollup-usage",
    schedule: { kind: "cron", expression: "0 * * * *" }, // hourly
    payload: { windowMs: 3_600_000, batchSize: 500 },
    maxRetries: 3,
  },
  {
    id: "reconcile-settlements",
    name: "reconcile-settlements",
    schedule: { kind: "cron", expression: "*/10 * * * *" }, // every 10 minutes
    payload: { batchSize: 100 },
    maxRetries: 3,
  },
  {
    id: "retry-webhooks",
    name: "retry-webhooks",
    schedule: { kind: "cron", expression: "*/5 * * * *" }, // every 5 minutes
    payload: { batchSize: 100, windowMs: 21_600_000 }, // 6-hour window
    maxRetries: 2,
  },
  {
    id: "generate-invoices",
    name: "generate-invoices",
    schedule: { kind: "cron", expression: "0 2 1 * *" }, // 02:00 on the 1st of each month
    payload: {},
    maxRetries: 5,
  },
  {
    id: "prune-audit",
    name: "prune-audit",
    schedule: { kind: "cron", expression: "0 3 * * *" }, // 03:00 daily
    payload: { retentionMs: 7_776_000_000, batchSize: 1_000 }, // 90 days
    maxRetries: 3,
  },
] as const;

export type ScheduledJobId = ScheduleTableEntry["id"];
