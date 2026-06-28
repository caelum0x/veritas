// SOC2 module error types extending AppError for compliance-specific failure cases.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class ControlNotFoundError extends AppError {
  constructor(controlId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `SOC2 control not found: ${controlId}`, options);
  }
}

export class EvidenceNotFoundError extends AppError {
  constructor(evidenceId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `SOC2 evidence not found: ${evidenceId}`, options);
  }
}

export class AssessmentNotFoundError extends AppError {
  constructor(assessmentId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `SOC2 assessment not found: ${assessmentId}`, options);
  }
}

export class FindingNotFoundError extends AppError {
  constructor(findingId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `SOC2 finding not found: ${findingId}`, options);
  }
}

export class AttestationNotFoundError extends AppError {
  constructor(attestationId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `SOC2 attestation not found: ${attestationId}`, options);
  }
}

export class DuplicateControlError extends AppError {
  constructor(controlCode: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `SOC2 control with code already exists: ${controlCode}`, options);
  }
}

export class InvalidEvidenceError extends AppError {
  constructor(reason: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `SOC2 evidence invalid: ${reason}`, options);
  }
}

export class AssessmentConflictError extends AppError {
  constructor(controlId: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `SOC2 assessment conflict for control: ${controlId}`, options);
  }
}

export class CollectorError extends AppError {
  constructor(collectorName: string, reason: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `SOC2 collector "${collectorName}" failed: ${reason}`, options);
  }
}

export class MappingNotFoundError extends AppError {
  constructor(frameworkId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `SOC2 framework mapping not found: ${frameworkId}`, options);
  }
}

export type Soc2Error =
  | ControlNotFoundError
  | EvidenceNotFoundError
  | AssessmentNotFoundError
  | FindingNotFoundError
  | AttestationNotFoundError
  | DuplicateControlError
  | InvalidEvidenceError
  | AssessmentConflictError
  | CollectorError
  | MappingNotFoundError;
