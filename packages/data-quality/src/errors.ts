// Domain errors for the data-quality package.
import { AppError } from "@veritas/core";

export class QualityRuleNotFoundError extends AppError {
  constructor(ruleId: string) {
    super("NOT_FOUND", 404, "Quality rule not found", { message: `Quality rule not found: ${ruleId}` });
  }
}

export class QualityCheckFailedError extends AppError {
  constructor(checkId: string, reason: string) {
    super("INTERNAL", 500, "Quality check failed", { message: `Quality check ${checkId} failed: ${reason}` });
  }
}

export class InvalidRuleConfigError extends AppError {
  constructor(ruleName: string, detail: string) {
    super("VALIDATION", 400, "Invalid rule config", { message: `Invalid rule config for "${ruleName}": ${detail}` });
  }
}

export class ProfilerError extends AppError {
  constructor(datasetId: string, reason: string) {
    super("INTERNAL", 500, "Profiling failed", { message: `Profiling failed for dataset "${datasetId}": ${reason}` });
  }
}

export class AnomalyDetectionError extends AppError {
  constructor(column: string, reason: string) {
    super("INTERNAL", 500, "Anomaly detection failed", { message: `Anomaly detection failed for column "${column}": ${reason}` });
  }
}
