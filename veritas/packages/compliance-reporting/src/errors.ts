// Compliance-reporting module error types extending AppError for domain-specific failures.

import { AppError, type AppErrorOptions, type ErrorCode } from "@veritas/core";

/** Compliance-domain error codes not present in the core ErrorCode union. */
export type ComplianceErrorCode =
  | "COMPLIANCE_REPORT_NOT_FOUND"
  | "COMPLIANCE_SCORECARD_NOT_FOUND"
  | "COMPLIANCE_EVIDENCE_LINK_NOT_FOUND"
  | "COMPLIANCE_SCHEDULE_NOT_FOUND"
  | "COMPLIANCE_DUPLICATE_SCHEDULE"
  | "COMPLIANCE_REPORT_GENERATION_ERROR"
  | "COMPLIANCE_INVALID_REPORT_PERIOD"
  | "COMPLIANCE_EVIDENCE_LINK_CONFLICT"
  | "COMPLIANCE_GAP_ANALYSIS_ERROR"
  | "COMPLIANCE_FRAMEWORK_NOT_SUPPORTED";

// Cast helper: compliance codes extend the stable code vocabulary at runtime.
const toCode = (c: ComplianceErrorCode): ErrorCode => c as unknown as ErrorCode;

export class ComplianceReportNotFoundError extends AppError {
  override readonly code = "COMPLIANCE_REPORT_NOT_FOUND" as unknown as ErrorCode;
  constructor(reportId: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_REPORT_NOT_FOUND"), 404, `Compliance report not found: ${reportId}`, options);
  }
}

export class ScorecardNotFoundError extends AppError {
  override readonly code = "COMPLIANCE_SCORECARD_NOT_FOUND" as unknown as ErrorCode;
  constructor(scorecardId: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_SCORECARD_NOT_FOUND"), 404, `Compliance scorecard not found: ${scorecardId}`, options);
  }
}

export class EvidenceLinkNotFoundError extends AppError {
  override readonly code = "COMPLIANCE_EVIDENCE_LINK_NOT_FOUND" as unknown as ErrorCode;
  constructor(linkId: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_EVIDENCE_LINK_NOT_FOUND"), 404, `Evidence link not found: ${linkId}`, options);
  }
}

export class ScheduleNotFoundError extends AppError {
  override readonly code = "COMPLIANCE_SCHEDULE_NOT_FOUND" as unknown as ErrorCode;
  constructor(scheduleId: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_SCHEDULE_NOT_FOUND"), 404, `Compliance schedule not found: ${scheduleId}`, options);
  }
}

export class DuplicateScheduleError extends AppError {
  override readonly code = "COMPLIANCE_DUPLICATE_SCHEDULE" as unknown as ErrorCode;
  constructor(framework: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_DUPLICATE_SCHEDULE"), 409, `Active compliance schedule already exists for framework: ${framework}`, options);
  }
}

export class ReportGenerationError extends AppError {
  override readonly code = "COMPLIANCE_REPORT_GENERATION_ERROR" as unknown as ErrorCode;
  constructor(reason: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_REPORT_GENERATION_ERROR"), 500, `Compliance report generation failed: ${reason}`, options);
  }
}

export class InvalidReportPeriodError extends AppError {
  override readonly code = "COMPLIANCE_INVALID_REPORT_PERIOD" as unknown as ErrorCode;
  constructor(reason: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_INVALID_REPORT_PERIOD"), 422, `Invalid compliance report period: ${reason}`, options);
  }
}

export class EvidenceLinkConflictError extends AppError {
  override readonly code = "COMPLIANCE_EVIDENCE_LINK_CONFLICT" as unknown as ErrorCode;
  constructor(requirementId: string, evidenceId: string, options?: AppErrorOptions) {
    super(
      toCode("COMPLIANCE_EVIDENCE_LINK_CONFLICT"),
      409,
      `Evidence ${evidenceId} is already linked to requirement ${requirementId}`,
      options,
    );
  }
}

export class GapAnalysisError extends AppError {
  override readonly code = "COMPLIANCE_GAP_ANALYSIS_ERROR" as unknown as ErrorCode;
  constructor(reason: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_GAP_ANALYSIS_ERROR"), 500, `Gap analysis failed: ${reason}`, options);
  }
}

export class FrameworkNotSupportedError extends AppError {
  override readonly code = "COMPLIANCE_FRAMEWORK_NOT_SUPPORTED" as unknown as ErrorCode;
  constructor(framework: string, options?: AppErrorOptions) {
    super(toCode("COMPLIANCE_FRAMEWORK_NOT_SUPPORTED"), 422, `Compliance framework not supported: ${framework}`, options);
  }
}

export type ComplianceReportingError =
  | ComplianceReportNotFoundError
  | ScorecardNotFoundError
  | EvidenceLinkNotFoundError
  | ScheduleNotFoundError
  | DuplicateScheduleError
  | ReportGenerationError
  | InvalidReportPeriodError
  | EvidenceLinkConflictError
  | GapAnalysisError
  | FrameworkNotSupportedError;
