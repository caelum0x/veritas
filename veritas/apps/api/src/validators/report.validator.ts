// Zod validators for report request bodies and query params.
import { z } from "zod";

export const listReportsQuerySchema = z.object({
  verificationId: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const reportIdParamSchema = z.object({
  id: z.string().min(1),
});

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type ReportIdParam = z.infer<typeof reportIdParamSchema>;
