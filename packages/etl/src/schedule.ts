// ETL schedule management — stores cron schedules and computes next run times.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import { newId } from "@veritas/core";
import type { Schedule, RunMode } from "./types.js";
import { ScheduleError } from "./errors.js";

export const CreateScheduleSchema = z.object({
  pipelineId: z.string().min(1),
  cron: z.string().min(1),
  mode: z.enum(["full", "incremental"]),
  enabled: z.boolean().default(true),
});

export type CreateSchedule = z.infer<typeof CreateScheduleSchema>;

// Parses a 5-field cron expression and computes next approximate Date.
// Supports "*" wildcards and numeric values only.
function nextCronDate(cron: string, from: Date): Date | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minPart: string = parts[0] ?? "*";
  const hourPart: string = parts[1] ?? "*";
  const base = new Date(from.getTime());
  base.setSeconds(0, 0);
  base.setMinutes(base.getMinutes() + 1);

  for (let attempt = 0; attempt < 1440; attempt++) {
    const m = base.getMinutes();
    const h = base.getHours();
    const minMatch = minPart === "*" || parseInt(minPart, 10) === m;
    const hourMatch = hourPart === "*" || parseInt(hourPart, 10) === h;
    if (minMatch && hourMatch) return new Date(base);
    base.setMinutes(base.getMinutes() + 1);
  }
  return null;
}

export interface ScheduleRepository {
  create(data: CreateSchedule): Promise<Result<Schedule, ScheduleError>>;
  findById(id: string): Promise<Result<Schedule, ScheduleError>>;
  findByPipelineId(pipelineId: string): Promise<Result<Schedule[], ScheduleError>>;
  findDue(now: string): Promise<Result<Schedule[], ScheduleError>>;
  update(
    id: string,
    patch: Partial<Pick<Schedule, "enabled" | "nextRunAt">>,
  ): Promise<Result<Schedule, ScheduleError>>;
  delete(id: string): Promise<Result<void, ScheduleError>>;
}

export class InMemoryScheduleRepository implements ScheduleRepository {
  private readonly store = new Map<string, Schedule>();

  async create(data: CreateSchedule): Promise<Result<Schedule, ScheduleError>> {
    const parsed = CreateScheduleSchema.safeParse(data);
    if (!parsed.success) {
      return err(new ScheduleError({ message: parsed.error.message }));
    }

    const next = nextCronDate(parsed.data.cron, new Date());
    const record: Schedule = Object.freeze({
      id: newId("sched"),
      pipelineId: parsed.data.pipelineId,
      cron: parsed.data.cron,
      mode: parsed.data.mode as RunMode,
      enabled: parsed.data.enabled,
      nextRunAt: next ? next.toISOString() : undefined,
    });
    this.store.set(record.id, record);
    return ok(record);
  }

  async findById(id: string): Promise<Result<Schedule, ScheduleError>> {
    const rec = this.store.get(id);
    if (!rec) {
      return err(new ScheduleError({ message: `Schedule not found: ${id}` }));
    }
    return ok(rec);
  }

  async findByPipelineId(pipelineId: string): Promise<Result<Schedule[], ScheduleError>> {
    const results = [...this.store.values()].filter((r) => r.pipelineId === pipelineId);
    return ok(results);
  }

  async findDue(now: string): Promise<Result<Schedule[], ScheduleError>> {
    const nowMs = new Date(now).getTime();
    const due = [...this.store.values()].filter(
      (r) =>
        r.enabled && r.nextRunAt !== undefined && new Date(r.nextRunAt).getTime() <= nowMs,
    );
    return ok(due);
  }

  async update(
    id: string,
    patch: Partial<Pick<Schedule, "enabled" | "nextRunAt">>,
  ): Promise<Result<Schedule, ScheduleError>> {
    const rec = this.store.get(id);
    if (!rec) {
      return err(new ScheduleError({ message: `Schedule not found: ${id}` }));
    }
    const updated = Object.freeze({ ...rec, ...patch });
    this.store.set(id, updated);
    return ok(updated);
  }

  async delete(id: string): Promise<Result<void, ScheduleError>> {
    if (!this.store.has(id)) {
      return err(new ScheduleError({ message: `Schedule not found: ${id}` }));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}

export function advanceSchedule(
  schedule: Schedule,
  ranAt: string,
): Pick<Schedule, "nextRunAt"> {
  const next = nextCronDate(schedule.cron, new Date(ranAt));
  return { nextRunAt: next ? next.toISOString() : undefined };
}
