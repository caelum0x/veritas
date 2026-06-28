// Maps @veritas/reporting domain types to HTTP response shapes.
import type { Report, ReportTemplate, ReportPage } from "@veritas/reporting";

export interface ReportResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly format: string;
  readonly ownerId: string;
  readonly organizationId: string;
  readonly parameters: Record<string, unknown>;
  readonly sectionCount: number;
  readonly generatedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReportListResponse {
  readonly items: readonly ReportResponse[];
  readonly meta: { readonly total: number; readonly page: number; readonly pageSize: number };
}

export function toReportResponse(report: Report): ReportResponse {
  return {
    id: report.id,
    title: report.title,
    description: report.description,
    status: report.status,
    format: report.format,
    ownerId: report.ownerId,
    organizationId: report.organizationId,
    parameters: report.parameters,
    sectionCount: report.sections.length,
    generatedAt: report.generatedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export function toReportListResponse(page: ReportPage): ReportListResponse {
  return {
    items: page.items.map(toReportResponse),
    meta: { total: page.total, page: page.page, pageSize: page.pageSize },
  };
}

export function toTemplateResponse(template: ReportTemplate): Record<string, unknown> {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    organizationId: template.organizationId,
    defaultFormat: template.defaultFormat,
    parameterCount: template.parameterDefs.length,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}
