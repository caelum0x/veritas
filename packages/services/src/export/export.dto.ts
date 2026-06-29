// Input/output DTOs for the export application service
import { z } from "zod";

export const ExportFormatSchema = z.enum(["json", "csv", "ndjson"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportResourceTypeSchema = z.enum([
  "claims",
  "reports",
  "verifications",
  "audit-logs",
  "usage",
  "invoices",
  "orders",
]);
export type ExportResourceType = z.infer<typeof ExportResourceTypeSchema>;

export const ExportStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type ExportStatus = z.infer<typeof ExportStatusSchema>;

export const RequestExportInputSchema = z.object({
  resourceType: ExportResourceTypeSchema,
  format: ExportFormatSchema.default("json"),
  filters: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      ids: z.array(z.string()).max(1000).optional(),
    })
    .optional(),
  includeFields: z.array(z.string().min(1)).optional(),
  excludeFields: z.array(z.string().min(1)).optional(),
});
export type RequestExportInput = z.infer<typeof RequestExportInputSchema>;

export const ExportJobOutputSchema = z.object({
  exportId: z.string(),
  resourceType: ExportResourceTypeSchema,
  format: ExportFormatSchema,
  status: ExportStatusSchema,
  requestedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  downloadUrl: z.string().url().nullable(),
  expiresAt: z.string().datetime().nullable(),
  rowCount: z.number().int().nonnegative().nullable(),
  fileSizeBytes: z.number().int().nonnegative().nullable(),
  errorMessage: z.string().nullable(),
});
export type ExportJobOutput = z.infer<typeof ExportJobOutputSchema>;

export const GetExportInputSchema = z.object({
  exportId: z.string().min(1),
});
export type GetExportInput = z.infer<typeof GetExportInputSchema>;

export const ListExportsInputSchema = z.object({
  resourceType: ExportResourceTypeSchema.optional(),
  status: ExportStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type ListExportsInput = z.infer<typeof ListExportsInputSchema>;

export const ListExportsOutputSchema = z.object({
  items: z.array(ExportJobOutputSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type ListExportsOutput = z.infer<typeof ListExportsOutputSchema>;

export const CancelExportInputSchema = z.object({
  exportId: z.string().min(1),
});
export type CancelExportInput = z.infer<typeof CancelExportInputSchema>;

export const DownloadExportInputSchema = z.object({
  exportId: z.string().min(1),
});
export type DownloadExportInput = z.infer<typeof DownloadExportInputSchema>;

export const DownloadExportOutputSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  fileSizeBytes: z.number().int().nonnegative(),
  format: ExportFormatSchema,
});
export type DownloadExportOutput = z.infer<typeof DownloadExportOutputSchema>;
