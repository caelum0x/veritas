// Core report domain model — defines Report, ReportSection, and related immutable value types.
import { z } from "zod";
import type { Id } from "@veritas/core";

export type ReportId = Id<"Report">;
export type SectionId = Id<"Section">;
export type TemplateId = Id<"Template">;
export type ScheduleId = Id<"Schedule">;

export const ReportStatusSchema = z.enum(["draft", "generating", "ready", "failed", "archived"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportFormatSchema = z.enum(["json", "html", "pdf", "csv", "markdown"]);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export const SectionTypeSchema = z.enum(["summary", "chart", "table", "text", "metric", "provenance"]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

export const ChartTypeSchema = z.enum(["bar", "line", "pie", "scatter", "heatmap", "area"]);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export interface ChartSpec {
  readonly type: ChartType;
  readonly title: string;
  readonly xAxis: string;
  readonly yAxis: string;
  readonly series: readonly string[];
  readonly data: readonly Record<string, unknown>[];
}

export interface TableSpec {
  readonly columns: readonly string[];
  readonly rows: readonly Record<string, unknown>[];
  readonly totalCount: number;
}

export interface MetricSpec {
  readonly label: string;
  readonly value: number | string;
  readonly unit?: string;
  readonly delta?: number;
  readonly trend?: "up" | "down" | "flat";
}

export type SectionContent =
  | { readonly kind: "chart"; readonly spec: ChartSpec }
  | { readonly kind: "table"; readonly spec: TableSpec }
  | { readonly kind: "metric"; readonly spec: MetricSpec }
  | { readonly kind: "text"; readonly markdown: string }
  | { readonly kind: "summary"; readonly markdown: string }
  | { readonly kind: "provenance"; readonly sources: readonly string[] };

export interface ReportSection {
  readonly id: SectionId;
  readonly reportId: ReportId;
  readonly type: SectionType;
  readonly title: string;
  readonly order: number;
  readonly content: SectionContent;
  readonly createdAt: string;
}

export interface Report {
  readonly id: ReportId;
  readonly title: string;
  readonly description: string;
  readonly status: ReportStatus;
  readonly format: ReportFormat;
  readonly templateId?: TemplateId;
  readonly ownerId: string;
  readonly organizationId: string;
  readonly parameters: Record<string, unknown>;
  readonly sections: readonly ReportSection[];
  readonly generatedAt?: string;
  readonly failureReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReportInput {
  readonly title: string;
  readonly description: string;
  readonly format: ReportFormat;
  readonly templateId?: TemplateId;
  readonly ownerId: string;
  readonly organizationId: string;
  readonly parameters: Record<string, unknown>;
}

export const CreateReportInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  format: ReportFormatSchema.default("json"),
  templateId: z.string().optional(),
  ownerId: z.string().min(1),
  organizationId: z.string().min(1),
  parameters: z.record(z.unknown()).default({}),
});
