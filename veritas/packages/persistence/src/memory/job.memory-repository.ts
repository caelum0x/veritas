// In-memory implementation of JobRepository for testing and local development.
import { ok, err, type Result, type Page, JobStatus } from "@veritas/core";
import type { Job, CreateJob, UpdateJob } from "@veritas/contracts";
import type { JobRepository } from "../repositories/job.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import { RepositoryNotFoundError } from "../errors.js";
import { rowToJob, createDtoToRow, mergeRow, type JobRow } from "../mappers/job.mapper.js";

/** In-memory store for Job rows, keyed by ID. */
export class JobMemoryRepository implements JobRepository {
  private readonly store = new Map<string, JobRow>();

  private now(): string {
    return new Date().toISOString();
  }

  async findById(id: string): Promise<Result<Job>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Job", id));
    }
    return ok(rowToJob(row));
  }

  async list(options?: QueryOptions<Job>): Promise<Result<Page<Job>>> {
    let rows = Array.from(this.store.values()).map(rowToJob);

    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }

    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateJob): Promise<Result<Job>> {
    const now = this.now();
    const row = createDtoToRow(dto, now);
    this.store.set(row.id, row);
    return ok(rowToJob(row));
  }

  async update(id: string, dto: UpdateJob): Promise<Result<Job>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Job", id));
    }
    const updated = mergeRow(existing, dto, this.now());
    this.store.set(id, updated);
    return ok(rowToJob(updated));
  }

  async delete(id: string): Promise<Result<Job>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Job", id));
    }
    this.store.delete(id);
    return ok(rowToJob(existing));
  }

  async findByStatus(status: JobStatus, options?: QueryOptions<Job>): Promise<Result<Page<Job>>> {
    const filterOptions: QueryOptions<Job> = {
      ...options,
      filter: {
        and: [
          { field: "status", operator: "eq", value: status },
          ...(options?.filter?.and ?? []),
        ],
      },
    };
    return this.list(filterOptions);
  }

  async findByVerificationId(verificationId: string): Promise<Result<Job>> {
    const found = Array.from(this.store.values())
      .map(rowToJob)
      .filter((j) => j.verificationId === verificationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (found === undefined) {
      return err(new RepositoryNotFoundError("Job", `verificationId:${verificationId}`));
    }
    return ok(found);
  }

  async countByStatus(): Promise<Result<Record<JobStatus, number>>> {
    const counts: Record<JobStatus, number> = {
      [JobStatus.QUEUED]: 0,
      [JobStatus.RUNNING]: 0,
      [JobStatus.SUCCEEDED]: 0,
      [JobStatus.FAILED]: 0,
      [JobStatus.CANCELLED]: 0,
    };
    for (const row of this.store.values()) {
      const status = row.status as JobStatus;
      if (status in counts) {
        counts[status]++;
      }
    }
    return ok(counts);
  }
}
