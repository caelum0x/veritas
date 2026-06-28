// Public surface of @veritas/reporting — re-exports all module symbols.

// Core report domain model
export type {
  ReportId,
  SectionId,
  TemplateId,
  ScheduleId,
  ReportStatus,
  ReportFormat,
  SectionType,
  ChartType,
  ChartSpec,
  TableSpec,
  MetricSpec,
  SectionContent,
  ReportSection,
  Report,
  CreateReportInput,
} from "./report.js";
export { ReportStatusSchema, ReportFormatSchema, SectionTypeSchema, ChartTypeSchema, CreateReportInputSchema } from "./report.js";

// Parameters
export type { ParameterType, DateRange, ParameterValue, EnumChoice, ParameterDef, ReportParameters } from "./parameter.js";
export {
  ParameterTypeSchema,
  DateRangeSchema,
  ParameterValueSchema,
  EnumChoiceSchema,
  ParameterDefSchema,
  ReportParametersSchema,
  resolveParameters,
  interpolate,
} from "./parameter.js";

// Shared types and port interfaces
export type {
  ReportResult,
  ReportPage,
  ReportListFilters,
  ReportStore,
  ReportTemplateStore,
  ReportTemplate,
  CreateReportTemplateInput,
  ReportScheduleStore,
  ReportSchedule,
  CreateReportScheduleInput,
  DeliveryChannel,
  ReportDelivery,
} from "./types.js";

// In-memory store implementations
export { InMemoryReportStore, InMemoryReportTemplateStore, InMemoryReportScheduleStore } from "./store.js";

// Errors
export {
  reportNotFound,
  templateNotFound,
  scheduleNotFound,
  reportConflict,
  reportValidationError,
  invalidParametersError,
  reportNotReady,
  exportUnsupportedFormat,
} from "./errors.js";
