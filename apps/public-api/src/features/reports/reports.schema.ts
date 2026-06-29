// Zod schemas for the reports feature HTTP layer — query params and path params.
import { z } from "zod";

/** GET /reports query string. */
export const ListReportsQuerySchema = z.object({
  verificationId: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;

/** :id path param for report endpoints. */
export const ReportIdParamSchema = z.object({
  id: z.string().min(1),
});
export type ReportIdParam = z.infer<typeof ReportIdParamSchema>;

/** :verificationId path param for by-verification lookup. */
export const VerificationIdParamSchema = z.object({
  verificationId: z.string().min(1),
});
export type VerificationIdParam = z.infer<typeof VerificationIdParamSchema>;
