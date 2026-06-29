// Handler for run-verification jobs: invokes the verification engine on a claim.
import { z } from "zod";
import { Result, ok, err, ValidationError, InternalError, Logger, noopLogger } from "@veritas/core";
import { Job } from "../queue/job.js";
import { JobHandler } from "../handler.js";

const RunVerificationPayloadSchema = z.object({
  claimId: z.string().min(1),
  organizationId: z.string().min(1),
  requestedBy: z.string().min(1),
  options: z
    .object({
      deepSearch: z.boolean().optional(),
      maxSources: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .optional(),
});

export type RunVerificationPayload = z.infer<typeof RunVerificationPayloadSchema>;

export interface VerificationService {
  verify(
    claimId: string,
    organizationId: string,
    requestedBy: string,
    options?: RunVerificationPayload["options"]
  ): Promise<Result<{ reportId: string; verdict: string }>>;
}

export class RunVerificationHandler implements JobHandler<RunVerificationPayload> {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly logger: Logger = noopLogger
  ) {}

  async handle(job: Job<RunVerificationPayload>): Promise<Result<void>> {
    const parsed = RunVerificationPayloadSchema.safeParse(job.payload);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return err(new ValidationError({ message: `Invalid run-verification payload: ${msg}` }));
    }

    const { claimId, organizationId, requestedBy, options } = parsed.data;
    this.logger.info("run-verification: starting", { claimId, jobId: job.id });

    const result = await this.verificationService.verify(
      claimId,
      organizationId,
      requestedBy,
      options
    );

    if (!result.ok) {
      const verifErrMsg = result.error instanceof Error ? result.error.message : String(result.error);
      this.logger.error("run-verification: engine error", {
        claimId,
        jobId: job.id,
        error: verifErrMsg,
      });
      return err(new InternalError({ message: `Verification engine failed: ${verifErrMsg}` }));
    }

    this.logger.info("run-verification: completed", {
      claimId,
      jobId: job.id,
      reportId: result.value.reportId,
      verdict: result.value.verdict,
    });

    return ok(undefined);
  }
}
