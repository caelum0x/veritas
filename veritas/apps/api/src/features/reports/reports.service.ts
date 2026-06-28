// Feature service: delegates report read/delete operations to the @veritas/services domain service.
import type { Page } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { IsoTimestamp } from "@veritas/core";
import {
  ReportService,
  makeServiceContext,
  type GetReportByIdInput,
  type GetReportByVerificationIdInput,
  type ListReportsInput,
  type DeleteReportInput,
  type ReportView,
} from "@veritas/services";
import type { Logger } from "@veritas/core";

/** Minimal slice of Deps needed by the reports feature. */
export interface ReportFeatureDeps {
  readonly reportService: ReportService;
  readonly logger: Logger;
}

function systemPrincipal() {
  return { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined };
}

function buildCtx(traceId: string, requestId: string) {
  return makeServiceContext(
    systemPrincipal(),
    traceId,
    requestId,
    new Date().toISOString() as IsoTimestamp,
  );
}

/** Fetch a single report by its ID. */
export async function getReportById(
  deps: ReportFeatureDeps,
  input: GetReportByIdInput,
  traceId: string,
  requestId: string,
): Promise<Result<ReportView, AppError>> {
  return deps.reportService.getById(buildCtx(traceId, requestId), input);
}

/** Fetch the report linked to a verification run. */
export async function getReportByVerificationId(
  deps: ReportFeatureDeps,
  input: GetReportByVerificationIdInput,
  traceId: string,
  requestId: string,
): Promise<Result<ReportView, AppError>> {
  return deps.reportService.getByVerificationId(buildCtx(traceId, requestId), input);
}

/** List reports with optional verificationId filter and cursor pagination. */
export async function listReports(
  deps: ReportFeatureDeps,
  input: ListReportsInput,
  traceId: string,
  requestId: string,
): Promise<Result<Page<ReportView>, AppError>> {
  return deps.reportService.list(buildCtx(traceId, requestId), input);
}

/** Delete a report by ID. */
export async function deleteReport(
  deps: ReportFeatureDeps,
  input: DeleteReportInput,
  traceId: string,
  requestId: string,
): Promise<Result<void, AppError>> {
  return deps.reportService.delete(buildCtx(traceId, requestId), input);
}
