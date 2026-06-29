// In-memory store for export job records.
import { type Result, ok, err, newId } from "@veritas/core";
import {
  ExportJobSchema,
  CreateExportJobSchema,
  type ExportJob,
  type CreateExportJob,
  type ExportStatus,
} from "./types.js";
import { ExportNotFoundError } from "./errors.js";

export interface ExportJobStore {
  create(input: CreateExportJob): Promise<Result<ExportJob, never>>;
  findById(id: string): Promise<Result<ExportJob, ExportNotFoundError>>;
  findAll(): Promise<Result<readonly ExportJob[], never>>;
  findBySchedule(scheduleId: string): Promise<Result<readonly ExportJob[], never>>;
  findByStatus(status: ExportStatus): Promise<Result<readonly ExportJob[], never>>;
  updateStatus(
    id: string,
    status: ExportStatus,
    meta?: Partial<Pick<ExportJob, "rowsExported" | "bytesWritten" | "errorMessage" | "startedAt" | "completedAt">>,
  ): Promise<Result<ExportJob, ExportNotFoundError>>;
  remove(id: string): Promise<Result<void, ExportNotFoundError>>;
}

export class InMemoryExportJobStore implements ExportJobStore {
  private readonly store = new Map<string, ExportJob>();

  async create(input: CreateExportJob): Promise<Result<ExportJob, never>> {
    const now = new Date().toISOString();
    const job: ExportJob = {
      id: newId("export"),
      scheduleId: input.scheduleId,
      destinationId: input.destinationId,
      format: input.format,
      compression: input.compression ?? "none",
      sourceTable: input.sourceTable,
      filters: input.filters ?? [],
      columns: input.columns,
      status: "pending",
      rowsExported: 0,
      bytesWritten: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(job.id, job);
    return ok(job);
  }

  async findById(id: string): Promise<Result<ExportJob, ExportNotFoundError>> {
    const job = this.store.get(id);
    if (job === undefined) return err(new ExportNotFoundError(id));
    return ok(job);
  }

  async findAll(): Promise<Result<readonly ExportJob[], never>> {
    return ok(Array.from(this.store.values()));
  }

  async findBySchedule(scheduleId: string): Promise<Result<readonly ExportJob[], never>> {
    const jobs = Array.from(this.store.values()).filter((j) => j.scheduleId === scheduleId);
    return ok(jobs);
  }

  async findByStatus(status: ExportStatus): Promise<Result<readonly ExportJob[], never>> {
    const jobs = Array.from(this.store.values()).filter((j) => j.status === status);
    return ok(jobs);
  }

  async updateStatus(
    id: string,
    status: ExportStatus,
    meta: Partial<Pick<ExportJob, "rowsExported" | "bytesWritten" | "errorMessage" | "startedAt" | "completedAt">> = {},
  ): Promise<Result<ExportJob, ExportNotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) return err(new ExportNotFoundError(id));
    const updated: ExportJob = {
      ...existing,
      ...meta,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return ok(updated);
  }

  async remove(id: string): Promise<Result<void, ExportNotFoundError>> {
    if (!this.store.has(id)) return err(new ExportNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }
}
