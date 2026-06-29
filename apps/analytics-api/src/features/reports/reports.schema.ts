// Zod schemas for report feature request/response validation.
import { z } from "zod";
import { CreateReportInputSchema, ReportStatusSchema, ReportFormatSchema } from "@veritas/reporting";

export { CreateReportInputSchema };

export const ListReportsQuerySchema = z.object({
  organizationId: z.string().optional(),
  ownerId: z.string().optional(),
  status: ReportStatusSchema.optional(),
  format: ReportFormatSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;

export const ReportIdParamSchema = z.object({ id: z.string().min(1) });
export type ReportIdParam = z.infer<typeof ReportIdParamSchema>;

export const UpdateReportBodySchema = CreateReportInputSchema.partial();
export type UpdateReportBody = z.infer<typeof UpdateReportBodySchema>;

export const GenerateReportBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2_000).optional().default(""),
  format: ReportFormatSchema.default("json"),
  ownerId: z.string().min(1),
  organizationId: z.string().min(1),
  parameters: z.record(z.unknown()).optional().default({}),
  deliver: z.boolean().optional().default(false),
});

export type GenerateReportBody = z.infer<typeof GenerateReportBodySchema>;

export const AnalyticsQueryBodySchema = z.object({
  organizationId: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
  granularity: z.enum(["hour", "day", "week", "month"]).optional().default("day"),
});

export type AnalyticsQueryBody = z.infer<typeof AnalyticsQueryBodySchema>;
