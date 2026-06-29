// DLP-specific error types extending AppError hierarchy
import { AppError } from "@veritas/core";

export class DlpPolicyViolationError extends AppError {
  constructor(message: string, public readonly policyId: string) {
    super("FORBIDDEN", 403, "DLP policy violation", { message, details: { policyId } });
    this.name = "DlpPolicyViolationError";
  }
}

export class DlpScanError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "DLP scan error", { message, cause });
    this.name = "DlpScanError";
  }
}

export class DlpRedactionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "DLP redaction error", { message, cause });
    this.name = "DlpRedactionError";
  }
}

export class DlpClassificationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "DLP classification error", { message, cause });
    this.name = "DlpClassificationError";
  }
}
