// Domain errors for flows-data flows.
import { AppError, type AppErrorOptions, type ErrorCode } from "@veritas/core";

export class EtlLoadFlowError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "ETL load flow failed", opts);
  }
}

export class ReportGenerateFlowError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Report generate flow failed", opts);
  }
}

export class UsageRollupFlowError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Usage rollup flow failed", opts);
  }
}

export class VerificationAnalyticsFlowError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Verification analytics flow failed", opts);
  }
}
