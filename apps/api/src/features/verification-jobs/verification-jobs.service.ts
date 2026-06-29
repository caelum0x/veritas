// Feature service: delegates verification-job CRUD operations to the @veritas/services domain service.
import type { Page } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import {
  VerificationJobService,
  makeServiceContext,
  type SubmitJobInput,
  type GetJobInput,
  type CancelJobInput,
  type ListJobsInput,
  type JobView,
} from "@veritas/services";
import type { Logger } from "@veritas/core";

/** Minimal slice of the container Deps needed by this feature. */
export interface VerificationJobFeatureDeps {
  readonly verificationJobService: VerificationJobService;
  readonly logger: Logger;
}

/** System principal used for background/internal service calls. */
function systemPrincipal() {
  return { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined };
}

/** Build a service context from caller-supplied identifiers. */
function buildCtx(traceId: string, requestId: string) {
  return makeServiceContext(
    systemPrincipal(),
    traceId,
    requestId,
    new Date().toISOString() as import("@veritas/core").IsoTimestamp,
  );
}

/** Submit a new verification job via the domain service. */
export async function submitJob(
  deps: VerificationJobFeatureDeps,
  input: SubmitJobInput,
  traceId: string,
  requestId: string,
): Promise<Result<JobView, AppError>> {
  const ctx = buildCtx(traceId, requestId);
  return deps.verificationJobService.submit(ctx, input);
}

/** Retrieve a single job by ID. */
export async function getJobById(
  deps: VerificationJobFeatureDeps,
  input: GetJobInput,
  traceId: string,
  requestId: string,
): Promise<Result<JobView, AppError>> {
  const ctx = buildCtx(traceId, requestId);
  return deps.verificationJobService.getById(ctx, input);
}

/** Cancel a queued job. */
export async function cancelJob(
  deps: VerificationJobFeatureDeps,
  input: CancelJobInput,
  traceId: string,
  requestId: string,
): Promise<Result<JobView, AppError>> {
  const ctx = buildCtx(traceId, requestId);
  return deps.verificationJobService.cancel(ctx, input);
}

/** List jobs with optional status filter and pagination. */
export async function listJobs(
  deps: VerificationJobFeatureDeps,
  input: ListJobsInput,
  traceId: string,
  requestId: string,
): Promise<Result<Page<JobView>, AppError>> {
  const ctx = buildCtx(traceId, requestId);
  return deps.verificationJobService.list(ctx, input);
}
