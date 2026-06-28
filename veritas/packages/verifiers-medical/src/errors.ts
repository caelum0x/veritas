// Medical verifier domain errors extending AppError.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class DrugNotFoundError extends AppError {
  constructor(drugName: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Drug not found in database: ${drugName}`, {
      details: { drugName, subCode: "DRUG_NOT_FOUND" },
      ...opts,
    });
  }
}

export class IcdCodeNotFoundError extends AppError {
  constructor(term: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `No ICD code found for term: ${term}`, {
      details: { term, subCode: "ICD_CODE_NOT_FOUND" },
      ...opts,
    });
  }
}

export class GuidelineNotFoundError extends AppError {
  constructor(condition: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `No guideline found for condition: ${condition}`, {
      details: { condition, subCode: "GUIDELINE_NOT_FOUND" },
      ...opts,
    });
  }
}

export class MedicalSourceUnavailableError extends AppError {
  constructor(source: string, reason?: string, opts?: Partial<AppErrorOptions>) {
    super(
      "UNAVAILABLE",
      503,
      `Medical source unavailable: ${source}${reason ? ` — ${reason}` : ""}`,
      {
        details: { source, reason, subCode: "MEDICAL_SOURCE_UNAVAILABLE" },
        ...opts,
      },
    );
  }
}

export class InsufficientMedicalEvidenceError extends AppError {
  constructor(claimId: string, opts?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Insufficient medical evidence to verify claim: ${claimId}`,
      {
        details: { claimId, subCode: "INSUFFICIENT_MEDICAL_EVIDENCE" },
        ...opts,
      },
    );
  }
}
