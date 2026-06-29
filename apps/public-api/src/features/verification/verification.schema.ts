// Zod schemas for the verification feature HTTP layer — request body and query params.
import { z } from "zod";
import { JobStatus } from "@veritas/core";

/** POST /verifications request body. */
export const SubmitVerificationBodySchema = z.object({
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
export type SubmitVerificationBody = z.infer<typeof SubmitVerificationBodySchema>;

/** GET /verifications query string. */
export const ListVerificationsQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListVerificationsQuery = z.infer<typeof ListVerificationsQuerySchema>;

/** :jobId path param. */
export const JobIdParamSchema = z.object({
  jobId: z.string().min(1),
});
export type JobIdParam = z.infer<typeof JobIdParamSchema>;
