// Verification-job application service: enqueue, track, cancel, and list jobs.
import {
  ok,
  err,
  isErr,
  isOk,
  newJobId,
  JobStatus,
  epochToIso,
  type Result,
  type AppError,
  type Logger,
  type Page,
  toPageRequest,
} from "@veritas/core";
import type { JobRepository } from "@veritas/persistence";
import { runVerification } from "@veritas/verification";
import type { EngineOptions } from "@veritas/verification";
import { MockProvider } from "@veritas/llm";
import type { ServiceContext } from "../service-context.js";
import { ResourceNotFoundError, PreconditionFailedError } from "../errors.js";
import type {
  SubmitJobInput,
  GetJobInput,
  CancelJobInput,
  ListJobsInput,
  JobView,
} from "./verification-job.dto.js";
import { SubmitJobInputSchema, ListJobsInputSchema } from "./verification-job.dto.js";

/** Dependencies injected into VerificationJobService. */
export interface VerificationJobServiceDeps {
  readonly jobRepository: JobRepository;
  readonly logger: Logger;
  /**
   * Fully-assembled engine options (LLM provider, guardrails, calibrator, …).
   * When omitted, a safe default using the deterministic MockProvider is built
   * so the job runner is always functional rather than silently broken.
   */
  readonly engineOptions?: EngineOptions;
}

/** Maps a persisted Job entity to a JobView projection. */
function toJobView(job: import("@veritas/contracts").Job): JobView {
  return {
    id: job.id,
    status: job.status,
    verificationId: job.verificationId,
    attempts: job.attempts,
    error: job.error,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

/** Application service for managing asynchronous verification jobs. */
export class VerificationJobService {
  private readonly jobs: JobRepository;
  private readonly logger: Logger;
  private readonly engineOptions: EngineOptions;

  constructor(deps: VerificationJobServiceDeps) {
    this.jobs = deps.jobRepository;
    this.logger = deps.logger;
    this.engineOptions =
      deps.engineOptions ?? { llm: new MockProvider(), logger: deps.logger };
  }

  /**
   * Enqueue a new verification job and immediately begin processing it.
   * Returns the initial JobView; status will transition asynchronously.
   */
  async submit(
    ctx: ServiceContext,
    input: SubmitJobInput,
  ): Promise<Result<JobView, AppError>> {
    const parsed = SubmitJobInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(
        new PreconditionFailedError(
          parsed.error.issues.map((i) => i.message).join("; "),
        ) as AppError,
      );
    }

    const data = parsed.data;
    const request = {
      text: data.text,
      claims: data.claims,
      context: data.context,
      options: data.allowedDomains ? { allowedDomains: data.allowedDomains } : undefined,
    };

    const createResult = await this.jobs.create({ request });
    if (isErr(createResult)) {
      return err(createResult.error as AppError);
    }

    const job = createResult.value;
    this.logger.info("verification-job: submitted", {
      jobId: job.id,
      traceId: ctx.traceId,
    });

    // Fire-and-forget: run verification pipeline and update job status.
    this.runJobAsync(job.id, request).catch((e: unknown) => {
      this.logger.error("verification-job: unexpected runner error", {
        jobId: job.id,
        error: e instanceof Error ? e.message : String(e),
      });
    });

    return ok(toJobView(job));
  }

  /** Fetch a single job by ID. */
  async getById(
    ctx: ServiceContext,
    input: GetJobInput,
  ): Promise<Result<JobView, AppError>> {
    const result = await this.jobs.findById(input.jobId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Job", input.jobId) as AppError);
    }
    this.logger.debug("verification-job: fetched", {
      jobId: input.jobId,
      traceId: ctx.traceId,
    });
    return ok(toJobView(result.value));
  }

  /** Cancel a queued job. Running or terminal jobs cannot be cancelled. */
  async cancel(
    ctx: ServiceContext,
    input: CancelJobInput,
  ): Promise<Result<JobView, AppError>> {
    const findResult = await this.jobs.findById(input.jobId);
    if (isErr(findResult)) {
      return err(new ResourceNotFoundError("Job", input.jobId) as AppError);
    }

    const job = findResult.value;
    if (job.status !== JobStatus.QUEUED) {
      return err(
        new PreconditionFailedError(
          `Job ${job.id} is in status '${job.status}' and cannot be cancelled.`,
        ) as AppError,
      );
    }

    const updateResult = await this.jobs.update(job.id, {
      status: JobStatus.CANCELLED,
    });
    if (isErr(updateResult)) {
      return err(updateResult.error as AppError);
    }

    this.logger.info("verification-job: cancelled", {
      jobId: job.id,
      traceId: ctx.traceId,
    });
    return ok(toJobView(updateResult.value));
  }

  /** List jobs with optional status filter and cursor-based pagination. */
  async list(
    ctx: ServiceContext,
    input: ListJobsInput,
  ): Promise<Result<Page<JobView>, AppError>> {
    const parsed = ListJobsInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(
        new PreconditionFailedError(
          parsed.error.issues.map((i) => i.message).join("; "),
        ) as AppError,
      );
    }

    const { status, cursor, limit } = parsed.data;
    const pageRequest = toPageRequest({ cursor, limit });

    let listResult: Result<Page<import("@veritas/contracts").Job>>;

    if (status !== undefined) {
      listResult = await this.jobs.findByStatus(status, {
        page: pageRequest,
      });
    } else {
      listResult = await this.jobs.list({ page: pageRequest });
    }

    if (isErr(listResult)) {
      return err(listResult.error as AppError);
    }

    const page = listResult.value;
    this.logger.debug("verification-job: listed", {
      count: page.items.length,
      traceId: ctx.traceId,
    });

    return ok({
      ...page,
      items: page.items.map(toJobView),
    });
  }

  /** Internal: run the verification pipeline and persist the outcome. */
  private async runJobAsync(
    jobId: string,
    request: import("@veritas/contracts").VerificationRequest,
  ): Promise<void> {
    const startMs = Date.now();

    await this.jobs.update(jobId, {
      status: JobStatus.RUNNING,
      startedAt: epochToIso(startMs),
    });

    const findResult = await this.jobs.findById(jobId);
    if (isErr(findResult) || findResult.value.status === JobStatus.CANCELLED) {
      return;
    }

    const verResult = await runVerification(request, this.engineOptions);
    const finishedAt = epochToIso(Date.now());

    if (isOk(verResult)) {
      await this.jobs.update(jobId, {
        status: JobStatus.SUCCEEDED,
        verificationId: verResult.value.report.provenance.verifier ?? null,
        finishedAt,
      });
      this.logger.info("verification-job: succeeded", { jobId });
    } else {
      await this.jobs.update(jobId, {
        status: JobStatus.FAILED,
        error: verResult.error.message,
        finishedAt,
      });
      this.logger.warn("verification-job: failed", {
        jobId,
        error: verResult.error.message,
      });
    }
  }
}
