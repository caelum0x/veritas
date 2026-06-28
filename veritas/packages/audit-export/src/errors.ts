// Typed errors for audit-export: export failures, chain integrity violations, format errors.

import { AppError } from "@veritas/core";

export class AuditExportError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Audit export failed", { message, cause });
  }
}

export class ChainIntegrityError extends AppError {
  readonly sequenceNumber: number;

  constructor(sequenceNumber: number, message: string, cause?: unknown) {
    super("INTERNAL", 500, "Chain integrity violation", { message, cause });
    this.sequenceNumber = sequenceNumber;
  }
}

export class FormatError extends AppError {
  readonly format: string;

  constructor(format: string, message: string, cause?: unknown) {
    super("INTERNAL", 500, "Audit format error", { message, cause });
    this.format = format;
  }
}

export class SiemDeliveryError extends AppError {
  readonly endpoint: string;

  constructor(endpoint: string, message: string, cause?: unknown) {
    super("UNAVAILABLE", 503, "SIEM delivery failed", { message, cause });
    this.endpoint = endpoint;
  }
}

export class FilterValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION", 400, "Filter validation failed", { message, cause });
  }
}
