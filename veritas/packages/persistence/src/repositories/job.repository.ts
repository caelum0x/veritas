// JobRepository interface defining persistence operations for async verification jobs.
import type { Result, Page, JobStatus } from "@veritas/core";
import type { Job, CreateJob, UpdateJob } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Extended repository interface for Job entities with status-based queries. */
export interface JobRepository extends BaseRepository<Job, CreateJob, UpdateJob> {
  /** Find a single job by its opaque ID. */
  findById(id: string): Promise<Result<Job>>;

  /** List jobs with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<Job>): Promise<Result<Page<Job>>>;

  /** Create a new job from a CreateJob DTO. */
  create(dto: CreateJob): Promise<Result<Job>>;

  /** Apply a partial update to an existing job. */
  update(id: string, dto: UpdateJob): Promise<Result<Job>>;

  /** Delete a job by ID, returning the deleted entity. */
  delete(id: string): Promise<Result<Job>>;

  /** Find all jobs matching a specific status. */
  findByStatus(status: JobStatus, options?: QueryOptions<Job>): Promise<Result<Page<Job>>>;

  /** Find the most recent job associated with a verification ID. */
  findByVerificationId(verificationId: string): Promise<Result<Job>>;

  /** Count jobs by status for monitoring and queue management. */
  countByStatus(): Promise<Result<Record<JobStatus, number>>>;
}
