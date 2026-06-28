// News-domain errors extending the verifier-kit error hierarchy.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class NewsDataUnavailableError extends AppError {
  constructor(outlet: string, source: string, opts: AppErrorOptions = {}) {
    super(
      "UNAVAILABLE",
      503,
      `News data for "${outlet}" unavailable from ${source}`,
      { details: { outlet, source }, ...opts },
    );
  }
}

export class OutletNotFoundError extends AppError {
  constructor(outletName: string, opts: AppErrorOptions = {}) {
    super(
      "NOT_FOUND",
      404,
      `News outlet not found in registry: "${outletName}"`,
      { details: { outletName }, ...opts },
    );
  }
}

export class WireServiceUnavailableError extends AppError {
  constructor(service: string, opts: AppErrorOptions = {}) {
    super(
      "UNAVAILABLE",
      503,
      `Wire service "${service}" is currently unavailable`,
      { details: { service }, ...opts },
    );
  }
}

export class NewsClaimAmbiguousError extends AppError {
  constructor(claimId: string, reason: string, opts: AppErrorOptions = {}) {
    super(
      "VALIDATION",
      422,
      `News claim ${claimId} is ambiguous: ${reason}`,
      { details: { claimId, reason }, ...opts },
    );
  }
}

export class RecencyCheckFailedError extends AppError {
  constructor(claimId: string, reason: string, opts: AppErrorOptions = {}) {
    super(
      "VALIDATION",
      422,
      `Recency check failed for claim ${claimId}: ${reason}`,
      { details: { claimId, reason }, ...opts },
    );
  }
}

export class CrossSourceResolutionError extends AppError {
  constructor(claimId: string, sourceCount: number, opts: AppErrorOptions = {}) {
    super(
      "VALIDATION",
      422,
      `Cross-source resolution failed for claim ${claimId}: only ${sourceCount} source(s) available`,
      { details: { claimId, sourceCount }, ...opts },
    );
  }
}
