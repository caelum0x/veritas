// Shared utility types and interfaces for the reporting module.
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { Report, ReportId, ReportSection, SectionId, TemplateId, ScheduleId, CreateReportInput } from "./report.js";
import type { ParameterDef, ReportParameters } from "./parameter.js";

/** Async result alias used throughout reporting. */
export type ReportResult<T> = Promise<Result<T, AppError>>;

/** Page of reports returned from list queries. */
export interface ReportPage {
  readonly items: readonly Report[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/** Filters accepted when listing reports. */
export interface ReportListFilters {
  readonly organizationId?: string;
  readonly ownerId?: string;
  readonly status?: Report["status"];
  readonly format?: Report["format"];
  readonly page?: number;
  readonly pageSize?: number;
}

/** Port interface — report storage. Implementations may be in-memory or DB-backed. */
export interface ReportStore {
  get(id: ReportId): ReportResult<Report>;
  list(filters: ReportListFilters): ReportResult<ReportPage>;
  create(input: CreateReportInput): ReportResult<Report>;
  update(id: ReportId, patch: Partial<Omit<Report, "id" | "createdAt">>): ReportResult<Report>;
  remove(id: ReportId): ReportResult<void>;
  addSection(section: ReportSection): ReportResult<ReportSection>;
  removeSection(reportId: ReportId, sectionId: SectionId): ReportResult<void>;
}

/** Port interface — report template storage. */
export interface ReportTemplateStore {
  get(id: TemplateId): ReportResult<ReportTemplate>;
  list(organizationId: string): ReportResult<readonly ReportTemplate[]>;
  create(input: CreateReportTemplateInput): ReportResult<ReportTemplate>;
  remove(id: TemplateId): ReportResult<void>;
}

/** A reusable template that parameterises report generation. */
export interface ReportTemplate {
  readonly id: TemplateId;
  readonly name: string;
  readonly description: string;
  readonly organizationId: string;
  readonly parameterDefs: readonly ParameterDef[];
  readonly defaultFormat: Report["format"];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Input for creating a new template. */
export interface CreateReportTemplateInput {
  readonly name: string;
  readonly description: string;
  readonly organizationId: string;
  readonly parameterDefs: readonly ParameterDef[];
  readonly defaultFormat: Report["format"];
}

/** Port interface — schedule storage. */
export interface ReportScheduleStore {
  get(id: ScheduleId): ReportResult<ReportSchedule>;
  list(organizationId: string): ReportResult<readonly ReportSchedule[]>;
  create(input: CreateReportScheduleInput): ReportResult<ReportSchedule>;
  update(id: ScheduleId, patch: Partial<Omit<ReportSchedule, "id" | "createdAt">>): ReportResult<ReportSchedule>;
  remove(id: ScheduleId): ReportResult<void>;
}

/** Cron-driven or interval-driven report schedule. */
export interface ReportSchedule {
  readonly id: ScheduleId;
  readonly templateId: TemplateId;
  readonly organizationId: string;
  readonly ownerId: string;
  readonly cronExpression: string;
  readonly parameters: ReportParameters;
  readonly enabled: boolean;
  readonly lastRunAt?: string;
  readonly nextRunAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Input for creating a schedule. */
export interface CreateReportScheduleInput {
  readonly templateId: TemplateId;
  readonly organizationId: string;
  readonly ownerId: string;
  readonly cronExpression: string;
  readonly parameters: ReportParameters;
  readonly enabled: boolean;
}

/** Delivery channel options. */
export type DeliveryChannel = "email" | "webhook" | "download";

/** Delivery record for a completed report. */
export interface ReportDelivery {
  readonly reportId: ReportId;
  readonly channel: DeliveryChannel;
  readonly destination: string;
  readonly deliveredAt: string;
  readonly success: boolean;
  readonly errorMessage?: string;
}
