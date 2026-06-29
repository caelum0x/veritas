// Compliance flow errors: wraps domain errors with flow-level context.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class DsrFulfillmentError extends AppError {
  constructor(dsrId: string, reason: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `DSR fulfillment failed for ${dsrId}: ${reason}`, opts);
  }
}

export class ErasureFlowError extends AppError {
  constructor(subjectId: string, reason: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `Erasure flow failed for subject ${subjectId}: ${reason}`, opts);
  }
}

export class RetentionPurgeFlowError extends AppError {
  constructor(reason: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `Retention purge flow failed: ${reason}`, opts);
  }
}

export class AuditExportFlowError extends AppError {
  constructor(reason: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `Audit export flow failed: ${reason}`, opts);
  }
}

export class ConsentCaptureError extends AppError {
  constructor(reason: string, opts?: AppErrorOptions) {
    super("VALIDATION", 422, `Consent capture failed: ${reason}`, opts);
  }
}

export class IdentityNotVerifiedError extends AppError {
  constructor(dsrId: string, opts?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Identity not verified for DSR: ${dsrId}`, opts);
  }
}
