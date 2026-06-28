// Port interface and in-memory implementation for export schedules.
import { z } from "zod";
import { type Result, ok, err, newId } from "@veritas/core";
import { ScheduleFrequencySchema, type ScheduleFrequency, ExportFormatSchema, CompressionSchema } from "./types.js";
import { ScheduleNotFoundError, ExportConflictError, ExportValidationError } from "./errors.js";

export const ScheduleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  destinationId: z.string(),
  frequency: ScheduleFrequencySchema,
  /** Cron expression — required when frequency === 'cron'. */
  cronExpression: z.string().optional(),
  sourceTable: z.object({ schema: z.string(), name: z.string() }),
  format: ExportFormatSchema,
  compression: CompressionSchema,
  columns: z.array(z.string()).readonly().optional(),
  enabled: z.boolean(),
  lastRunAt: z.string().optional(),
  nextRunAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const CreateScheduleSchema = ScheduleSchema.pick({
  name: true,
  destinationId: true,
  frequency: true,
  sourceTable: true,
  format: true,
}).extend({
  cronExpression: z.string().optional(),
  compression: CompressionSchema.default("none"),
  columns: z.array(z.string()).readonly().optional(),
  enabled: z.boolean().default(true),
});
export type CreateSchedule = z.infer<typeof CreateScheduleSchema>;

export interface SchedulePort {
  create(input: CreateSchedule): Promise<Result<Schedule, ExportValidationError | ExportConflictError>>;
  findById(id: string): Promise<Result<Schedule, ScheduleNotFoundError>>;
  findAll(): Promise<Result<readonly Schedule[], never>>;
  update(id: string, patch: Partial<Pick<Schedule, "name" | "cronExpression" | "enabled" | "nextRunAt" | "lastRunAt">>): Promise<Result<Schedule, ScheduleNotFoundError>>;
  remove(id: string): Promise<Result<void, ScheduleNotFoundError>>;
  findDue(before: string): Promise<Result<readonly Schedule[], never>>;
}

function validateCron(s: CreateSchedule): ExportValidationError | null {
  if (s.frequency === "cron" && !s.cronExpression) {
    return new ExportValidationError("cronExpression is required when frequency is 'cron'");
  }
  return null;
}

export class InMemoryScheduleStore implements SchedulePort {
  private readonly store = new Map<string, Schedule>();

  async create(input: CreateSchedule): Promise<Result<Schedule, ExportValidationError>> {
    const validationErr = validateCron(input);
    if (validationErr !== null) return err(validationErr);
    const now = new Date().toISOString();
    const schedule: Schedule = {
      id: newId("sched"),
      name: input.name,
      destinationId: input.destinationId,
      frequency: input.frequency as ScheduleFrequency,
      cronExpression: input.cronExpression,
      sourceTable: input.sourceTable,
      format: input.format,
      compression: input.compression ?? "none",
      columns: input.columns,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(schedule.id, schedule);
    return ok(schedule);
  }

  async findById(id: string): Promise<Result<Schedule, ScheduleNotFoundError>> {
    const s = this.store.get(id);
    if (s === undefined) return err(new ScheduleNotFoundError(id));
    return ok(s);
  }

  async findAll(): Promise<Result<readonly Schedule[], never>> {
    return ok(Array.from(this.store.values()));
  }

  async update(
    id: string,
    patch: Partial<Pick<Schedule, "name" | "cronExpression" | "enabled" | "nextRunAt" | "lastRunAt">>,
  ): Promise<Result<Schedule, ScheduleNotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) return err(new ScheduleNotFoundError(id));
    const updated: Schedule = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    return ok(updated);
  }

  async remove(id: string): Promise<Result<void, ScheduleNotFoundError>> {
    if (!this.store.has(id)) return err(new ScheduleNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }

  async findDue(before: string): Promise<Result<readonly Schedule[], never>> {
    const threshold = new Date(before).getTime();
    const due = Array.from(this.store.values()).filter(
      (s) => s.enabled && s.nextRunAt !== undefined && new Date(s.nextRunAt).getTime() <= threshold,
    );
    return ok(due);
  }
}
