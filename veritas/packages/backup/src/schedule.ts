// schedule.ts: manages backup schedules — CRUD and next-run calculation (no cron runner dep).
import { newId, ok, err, type Result } from "@veritas/core";
import { newScheduleId, type BackupSchedule, type BackupTarget, type RetentionPolicy, type ScheduleId } from "./types.js";
import { BackupScheduleError, BackupNotFoundError } from "./errors.js";
import type { BackupError } from "./errors.js";

export interface CreateScheduleInput {
  readonly target: BackupTarget;
  readonly cron: string;
  readonly kind: "full" | "incremental";
  readonly retention: RetentionPolicy;
  readonly tags?: Record<string, string>;
  readonly enabled?: boolean;
}

export interface UpdateScheduleInput {
  readonly cron?: string;
  readonly kind?: "full" | "incremental";
  readonly retention?: RetentionPolicy;
  readonly enabled?: boolean;
  readonly tags?: Record<string, string>;
}

/** Port interface for schedule persistence. */
export interface ScheduleStorePort {
  save(schedule: BackupSchedule): Promise<Result<void, BackupError>>;
  load(id: ScheduleId): Promise<Result<BackupSchedule, BackupError>>;
  list(): Promise<Result<readonly BackupSchedule[], BackupError>>;
  delete(id: ScheduleId): Promise<Result<void, BackupError>>;
}

/** In-memory schedule store for testing and development. */
export class InMemoryScheduleStore implements ScheduleStorePort {
  private readonly schedules = new Map<string, BackupSchedule>();

  async save(schedule: BackupSchedule): Promise<Result<void, BackupError>> {
    this.schedules.set(schedule.id, schedule);
    return ok(undefined);
  }

  async load(id: ScheduleId): Promise<Result<BackupSchedule, BackupError>> {
    const s = this.schedules.get(id);
    if (!s) return err(new BackupNotFoundError(id));
    return ok(s);
  }

  async list(): Promise<Result<readonly BackupSchedule[], BackupError>> {
    return ok([...this.schedules.values()]);
  }

  async delete(id: ScheduleId): Promise<Result<void, BackupError>> {
    this.schedules.delete(id);
    return ok(undefined);
  }
}

/** Service wrapping schedule store with creation and update logic. */
export class ScheduleService {
  constructor(private readonly store: ScheduleStorePort) {}

  async create(input: CreateScheduleInput, now: string): Promise<Result<BackupSchedule, BackupError>> {
    if (!isValidCron(input.cron)) {
      return err(new BackupScheduleError(`Invalid cron expression: "${input.cron}"`));
    }

    const schedule: BackupSchedule = {
      id: newScheduleId(newId("sched")),
      target: input.target,
      cron: input.cron,
      kind: input.kind,
      retention: input.retention,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
      nextRunAt: computeNextRun(input.cron, new Date(now))?.toISOString(),
      tags: input.tags,
    };

    const saveResult = await this.store.save(schedule);
    if (!saveResult.ok) return saveResult;
    return ok(schedule);
  }

  async update(id: ScheduleId, input: UpdateScheduleInput, now: string): Promise<Result<BackupSchedule, BackupError>> {
    const loadResult = await this.store.load(id);
    if (!loadResult.ok) return loadResult;

    const existing = loadResult.value;
    const newCron = input.cron ?? existing.cron;

    if (input.cron && !isValidCron(input.cron)) {
      return err(new BackupScheduleError(`Invalid cron expression: "${input.cron}"`));
    }

    const updated: BackupSchedule = {
      ...existing,
      ...(input.cron !== undefined ? { cron: input.cron } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.retention !== undefined ? { retention: input.retention } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      updatedAt: now,
      nextRunAt: computeNextRun(newCron, new Date(now))?.toISOString(),
    };

    const saveResult = await this.store.save(updated);
    if (!saveResult.ok) return saveResult;
    return ok(updated);
  }

  async get(id: ScheduleId): Promise<Result<BackupSchedule, BackupError>> {
    return this.store.load(id);
  }

  async list(): Promise<Result<readonly BackupSchedule[], BackupError>> {
    return this.store.list();
  }

  async remove(id: ScheduleId): Promise<Result<void, BackupError>> {
    return this.store.delete(id);
  }

  /** Mark a schedule as just run and compute its next run time. */
  async recordRun(id: ScheduleId, ranAt: string): Promise<Result<BackupSchedule, BackupError>> {
    const loadResult = await this.store.load(id);
    if (!loadResult.ok) return loadResult;

    const existing = loadResult.value;
    const updated: BackupSchedule = {
      ...existing,
      lastRunAt: ranAt,
      nextRunAt: computeNextRun(existing.cron, new Date(ranAt))?.toISOString(),
      updatedAt: ranAt,
    };

    const saveResult = await this.store.save(updated);
    if (!saveResult.ok) return saveResult;
    return ok(updated);
  }
}

/** Minimal cron validation: five or six space-separated fields. */
function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  return parts.length >= 5 && parts.length <= 6;
}

/**
 * Compute the next run time after `from` for a standard 5-field cron expression.
 * This is a simplified heuristic — production would use a proper cron parser.
 * Handles only the most common patterns (e.g. "0 2 * * *").
 */
function computeNextRun(cron: string, from: Date): Date | undefined {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return undefined;

    const minuteStr = parts[0] ?? "*";
    const hourStr = parts[1] ?? "*";
    const minute = minuteStr === "*" ? 0 : parseInt(minuteStr, 10);
    const hour = hourStr === "*" ? from.getUTCHours() : parseInt(hourStr, 10);

    if (isNaN(minute) || isNaN(hour)) return undefined;

    const next = new Date(from);
    next.setUTCSeconds(0, 0);
    next.setUTCMinutes(minute);
    next.setUTCHours(hour);

    // If the computed time is not after `from`, advance by one day.
    if (next.getTime() <= from.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    return next;
  } catch {
    return undefined;
  }
}
