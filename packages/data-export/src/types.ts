// Shared type definitions for the data-export module.
import { z } from "zod";

export const ExportFormatSchema = z.enum(["csv", "jsonl", "parquet"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type ExportStatus = z.infer<typeof ExportStatusSchema>;

export const CompressionSchema = z.enum(["none", "gzip", "zstd"]);
export type Compression = z.infer<typeof CompressionSchema>;

export const DestinationKindSchema = z.enum([
  "s3",
  "gcs",
  "azure-blob",
  "local",
  "http",
  "sftp",
]);
export type DestinationKind = z.infer<typeof DestinationKindSchema>;

export const ScheduleFrequencySchema = z.enum([
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "cron",
]);
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencySchema>;

export const ExportJobSchema = z.object({
  id: z.string(),
  scheduleId: z.string().optional(),
  destinationId: z.string(),
  format: ExportFormatSchema,
  compression: CompressionSchema,
  sourceTable: z.object({ schema: z.string(), name: z.string() }),
  filters: z.array(z.unknown()).readonly(),
  columns: z.array(z.string()).readonly().optional(),
  status: ExportStatusSchema,
  rowsExported: z.number().int().nonnegative(),
  bytesWritten: z.number().int().nonnegative(),
  errorMessage: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExportJob = z.infer<typeof ExportJobSchema>;

export const CreateExportJobSchema = ExportJobSchema.pick({
  destinationId: true,
  format: true,
  sourceTable: true,
}).extend({
  scheduleId: z.string().optional(),
  compression: CompressionSchema.default("none"),
  filters: z.array(z.unknown()).readonly().default([]),
  columns: z.array(z.string()).readonly().optional(),
});
export type CreateExportJob = z.infer<typeof CreateExportJobSchema>;

/** The result of serializing rows into a specific export format. */
export interface ExportResult {
  readonly format: ExportFormat;
  readonly data: Uint8Array;
  readonly rowCount: number;
  readonly byteSize: number;
}
