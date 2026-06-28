// Zod validators for verification-job request bodies and query params.
import { z } from "zod";
import { JobStatus } from "@veritas/core";

/** Body schema for POST /verification-jobs (submit a new job). */
export const submitJobBodySchema = z
  .object({
    text: z.string().min(1).optional(),
    claims: z.array(z.string().min(1)).min(1).optional(),
    context: z.string().optional(),
    allowedDomains: z.array(z.string().min(1)).optional(),
    idempotencyKey: z.string().optional(),
  })
  .refine(
    (d) =>
      (d.text !== undefined && d.text.length > 0) ||
      (d.claims !== undefined && d.claims.length > 0),
    { message: "Provide either 'text' or at least one 'claims' entry.", path: ["text"] }
  );

export type SubmitJobBody = z.infer<typeof submitJobBodySchema>;

/** Query schema for GET /verification-jobs (list jobs). */
export const listJobsQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;

/** Params schema for routes with :jobId. */
export const jobIdParamSchema = z.object({
  jobId: z.string().min(1),
});

export type JobIdParam = z.infer<typeof jobIdParamSchema>;
