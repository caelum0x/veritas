// Zod schemas for the reports HTTP layer: query strings and path params.
import { z } from "zod";

/** GET /v1/reports query params. */
export const listReportsQuerySchema = z.object({
  verificationId: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

/** Path param for single-report routes. */
export const reportIdParamSchema = z.object({
  reportId: z.string().min(1),
});
export type ReportIdParam = z.infer<typeof reportIdParamSchema>;

/** Path param for report-by-verification-id. */
export const verificationIdParamSchema = z.object({
  verificationId: z.string().min(1),
});
export type VerificationIdParam = z.infer<typeof verificationIdParamSchema>;
