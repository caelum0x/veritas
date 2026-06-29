// errors.ts: domain-specific errors for the contradiction detection module.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class NliClassificationError extends AppError {
  constructor(pairId: string, cause?: unknown, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `NLI classification failed for pair: ${pairId}`, {
      details: { pairId },
      cause: cause instanceof Error ? cause : undefined,
      ...opts,
    });
    this.name = "NliClassificationError";
  }
}

export class ContradictionNotFoundError extends AppError {
  constructor(contradictionId: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Contradiction not found: ${contradictionId}`, {
      details: { contradictionId },
      ...opts,
    });
    this.name = "ContradictionNotFoundError";
  }
}

export class ClusteringError extends AppError {
  constructor(reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Contradiction clustering failed: ${reason}`, {
      details: { reason },
      ...opts,
    });
    this.name = "ClusteringError";
  }
}

export class ExplanationError extends AppError {
  constructor(contradictionId: string, cause?: unknown, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Failed to explain contradiction: ${contradictionId}`, {
      details: { contradictionId },
      cause: cause instanceof Error ? cause : undefined,
      ...opts,
    });
    this.name = "ExplanationError";
  }
}

export class TooManyPairsError extends AppError {
  constructor(actual: number, limit: number, opts?: Partial<AppErrorOptions>) {
    super("VALIDATION", 422, `Too many claim pairs: ${actual} exceeds limit of ${limit}`, {
      details: { actual, limit },
      ...opts,
    });
    this.name = "TooManyPairsError";
  }
}

export class InvalidClaimError extends AppError {
  constructor(claimId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("VALIDATION", 400, `Invalid claim ${claimId}: ${reason}`, {
      details: { claimId, reason },
      ...opts,
    });
    this.name = "InvalidClaimError";
  }
}

export class MatrixBuildError extends AppError {
  constructor(reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Pairwise matrix build failed: ${reason}`, {
      details: { reason },
      ...opts,
    });
    this.name = "MatrixBuildError";
  }
}

/** @deprecated Use NliClassificationError */
export class NliError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause: cause instanceof Error ? cause : undefined });
    this.name = "NliError";
  }
}

/** @deprecated Use ClusteringError or MatrixBuildError */
export class ContradictionDetectorError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause: cause instanceof Error ? cause : undefined });
    this.name = "ContradictionDetectorError";
  }
}

/** @deprecated Use ClusteringError */
export class ConsistencyGraphError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause: cause instanceof Error ? cause : undefined });
    this.name = "ConsistencyGraphError";
  }
}
