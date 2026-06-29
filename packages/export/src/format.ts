// Export format enum and utilities for selecting output format
import { z } from "zod";

export const ExportFormatSchema = z.enum(["json", "csv", "markdown", "pdf", "html"]);

export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const EXPORT_FORMATS: readonly ExportFormat[] = ["json", "csv", "markdown", "pdf", "html"] as const;

export function isExportFormat(value: unknown): value is ExportFormat {
  return ExportFormatSchema.safeParse(value).success;
}

export function mimeTypeOf(format: ExportFormat): string {
  const map: Record<ExportFormat, string> = {
    json: "application/json",
    csv: "text/csv",
    markdown: "text/markdown",
    pdf: "application/pdf",
    html: "text/html",
  };
  return map[format];
}

export function extensionOf(format: ExportFormat): string {
  const map: Record<ExportFormat, string> = {
    json: ".json",
    csv: ".csv",
    markdown: ".md",
    pdf: ".pdf",
    html: ".html",
  };
  return map[format];
}
