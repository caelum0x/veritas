// Zod schemas for verification-jobs HTTP layer: request body, query, and path params.
import { z } from "zod";
import { JobStatus } from "@veritas/core";

/** POST /v1/verification-jobs body. */
export const submitJobBodySchema = z.object({
  text: z.string().min(1).optional(),
  claims: z.array(z.string().min(1)).min(1).optional(),
  context: z.string().optional(),
  allowedDomains: z.array(z.string().min(1)).optional(),
  idempotencyKey: z.string().optional(),
}).refine(
  (d) =>
    (d.text !== undefined && d.text.length > 0) ||
    (d.claims !== undefined && d.claims.length > 0),
  { message: "Provide either text or at least one claim.", path: ["text"] },
);
export type SubmitJobBody = z.infer<typeof submitJobBodySchema>;

/** GET /v1/verification-jobs query. */
export const listJobsQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;

/** Path param for single-job routes. */
export const jobIdParamSchema = z.object({
  jobId: z.string().min(1),
});
export type JobIdParam = z.infer<typeof jobIdParamSchema>;
