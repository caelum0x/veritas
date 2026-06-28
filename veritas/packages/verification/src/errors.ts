// Verification-specific error types extending @veritas/core AppError hierarchy.
import { AppError, type AppErrorOptions, InternalError } from "@veritas/core";

/** Raised when a claim cannot be parsed or is structurally invalid. */
export class ClaimParseError extends AppError {
  readonly kind = "CLAIM_PARSE_ERROR" as const;

  constructor(message: string, public readonly claimText?: string) {
    super("VALIDATION", 422, "Claim parse error", { message });
  }
}

/** Raised when the research stage fails to gather sufficient evidence. */
export class EvidenceGatherError extends AppError {
  readonly kind = "EVIDENCE_GATHER_ERROR" as const;

  constructor(
    message: string,
    public readonly claimId?: string,
    cause?: unknown,
  ) {
    super("UNAVAILABLE", 503, "Evidence gather error", { message, cause });
  }
}

/** Raised when the adjudication LLM call fails or returns an invalid response. */
export class AdjudicationError extends AppError {
  readonly kind = "ADJUDICATION_ERROR" as const;

  constructor(
    message: string,
    public readonly claimId?: string,
    cause?: unknown,
  ) {
    super("INTERNAL", 500, "Adjudication error", { message, cause });
  }
}

/** Raised when a pipeline stage receives input that violates its preconditions. */
export class PipelineError extends AppError {
  readonly kind = "PIPELINE_ERROR" as const;

  constructor(message: string, public readonly stageName?: string) {
    super("INTERNAL", 500, "Pipeline error", { message });
  }
}

/** Raised when source resolution / domain filtering rejects all candidate sources. */
export class SourceError extends AppError {
  readonly kind = "SOURCE_ERROR" as const;

  constructor(message: string, public readonly url?: string) {
    super("NOT_FOUND", 404, "Source error", { message });
  }
}

/** Raised when report assembly fails due to missing or inconsistent intermediate state. */
export class ReportAssemblyError extends InternalError {
  readonly kind = "REPORT_ASSEMBLY_ERROR" as const;

  constructor(message: string) {
    super({ message });
  }
}

/** Raised when the provenance hash or attestation cannot be computed. */
export class ProvenanceError extends InternalError {
  readonly kind = "PROVENANCE_ERROR" as const;

  constructor(message: string, cause?: unknown) {
    super({ message, cause });
  }
}

/** Union of all verification-specific errors for exhaustive handling. */
export type VerificationError =
  | ClaimParseError
  | EvidenceGatherError
  | AdjudicationError
  | PipelineError
  | SourceError
  | ReportAssemblyError
  | ProvenanceError;

export function isVerificationError(err: unknown): err is VerificationError {
  return (
    err instanceof ClaimParseError ||
    err instanceof EvidenceGatherError ||
    err instanceof AdjudicationError ||
    err instanceof PipelineError ||
    err instanceof SourceError ||
    err instanceof ReportAssemblyError ||
    err instanceof ProvenanceError
  );
}
