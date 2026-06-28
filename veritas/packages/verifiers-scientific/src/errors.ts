// Scientific verifier domain errors extending core AppError base class.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class PubMedUnavailableError extends AppError {
  constructor(reason?: string, opts?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `PubMed source unavailable${reason ? `: ${reason}` : ""}`,
      { details: { source: "pubmed", reason }, ...opts },
    );
  }
}

export class CrossrefUnavailableError extends AppError {
  constructor(reason?: string, opts?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `Crossref source unavailable${reason ? `: ${reason}` : ""}`,
      { details: { source: "crossref", reason }, ...opts },
    );
  }
}

export class ArxivUnavailableError extends AppError {
  constructor(reason?: string, opts?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `arXiv source unavailable${reason ? `: ${reason}` : ""}`,
      { details: { source: "arxiv", reason }, ...opts },
    );
  }
}

export class DoiResolutionError extends AppError {
  constructor(doi: string, reason?: string, opts?: AppErrorOptions) {
    super(
      "INTERNAL",
      502,
      `Failed to resolve DOI ${doi}${reason ? `: ${reason}` : ""}`,
      { details: { doi, reason }, ...opts },
    );
  }
}

export class RetractionCheckError extends AppError {
  constructor(doi: string, reason?: string, opts?: AppErrorOptions) {
    super(
      "INTERNAL",
      502,
      `Retraction check failed for DOI ${doi}${reason ? `: ${reason}` : ""}`,
      { details: { doi, reason }, ...opts },
    );
  }
}

export class ScientificClaimParseError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super(
      "VALIDATION",
      422,
      `Failed to parse scientific claim: ${message}`,
      { details: { message }, ...opts },
    );
  }
}
