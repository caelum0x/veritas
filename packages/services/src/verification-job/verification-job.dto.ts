// DTOs for verification-job use-cases: request shapes and response projections.
import { z } from "zod";
import { JobStatus } from "@veritas/core";

/** Input DTO for submitting a new verification job. */
export const SubmitJobInputSchema = z.object({
  /** Raw text to verify (mutually exclusive with claims). */
  text: z.string().min(1).optional(),
  /** Explicit list of claims to verify (mutually exclusive with text). */
  claims: z.array(z.string().min(1)).min(1).optional(),
  /** Optional context hint to improve adjudication accuracy. */
  context: z.string().optional(),
  /** Domains to restrict source research to. */
  allowedDomains: z.array(z.string().min(1)).optional(),
  /** Caller-supplied idempotency key. */
  idempotencyKey: z.string().optional(),
}).refine(
  (d) =>
    (d.text !== undefined && d.text.length > 0) ||
    (d.claims !== undefined && d.claims.length > 0),
  { message: "Provide either text or at least one claim.", path: ["text"] },
);
export type SubmitJobInput = z.infer<typeof SubmitJobInputSchema>;

/** Input DTO for fetching a single job. */
export const GetJobInputSchema = z.object({
  jobId: z.string().min(1),
});
export type GetJobInput = z.infer<typeof GetJobInputSchema>;

/** Input DTO for cancelling a pending/running job. */
export const CancelJobInputSchema = z.object({
  jobId: z.string().min(1),
});
export type CancelJobInput = z.infer<typeof CancelJobInputSchema>;

/** Input DTO for listing jobs with optional status filter and pagination. */
export const ListJobsInputSchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type ListJobsInput = z.infer<typeof ListJobsInputSchema>;

/** Lightweight job projection returned to callers. */
export interface JobView {
  readonly id: string;
  readonly status: JobStatus;
  readonly verificationId: string | null;
  readonly attempts: number;
  readonly error: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
