// Legal-domain errors extending the verifier-kit error hierarchy.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class StatuteNotFoundError extends AppError {
  readonly domainCode = "STATUTE_NOT_FOUND" as const;
  constructor(citation: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Statute not found for citation: ${citation}`, {
      details: { citation },
      ...opts,
    });
  }
}

export class CaseLawNotFoundError extends AppError {
  readonly domainCode = "CASE_LAW_NOT_FOUND" as const;
  constructor(citation: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Case law not found for citation: ${citation}`, {
      details: { citation },
      ...opts,
    });
  }
}

export class JurisdictionUnknownError extends AppError {
  readonly domainCode = "JURISDICTION_UNKNOWN" as const;
  constructor(jurisdictionHint: string, opts?: Partial<AppErrorOptions>) {
    super("VALIDATION", 422, `Unknown or unsupported jurisdiction: ${jurisdictionHint}`, {
      details: { jurisdictionHint },
      ...opts,
    });
  }
}

export class LegalDataUnavailableError extends AppError {
  readonly domainCode = "LEGAL_DATA_UNAVAILABLE" as const;
  constructor(source: string, reason?: string, opts?: Partial<AppErrorOptions>) {
    super("UNAVAILABLE", 503, `Legal data unavailable from ${source}${reason ? `: ${reason}` : ""}`, {
      details: { source, reason },
      ...opts,
    });
  }
}

export class LegalCitationParseError extends AppError {
  readonly domainCode = "LEGAL_CITATION_PARSE_ERROR" as const;
  constructor(rawCitation: string, opts?: Partial<AppErrorOptions>) {
    super("VALIDATION", 422, `Failed to parse legal citation: "${rawCitation}"`, {
      details: { rawCitation },
      ...opts,
    });
  }
}

export class LegalClaimAmbiguousError extends AppError {
  readonly domainCode = "LEGAL_CLAIM_AMBIGUOUS" as const;
  constructor(claimId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("VALIDATION", 422, `Legal claim ${claimId} is ambiguous: ${reason}`, {
      details: { claimId, reason },
      ...opts,
    });
  }
}

export class StatuteRepealedError extends AppError {
  readonly domainCode = "STATUTE_REPEALED" as const;
  constructor(citation: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 410, `Statute "${citation}" has been repealed or superseded`, {
      details: { citation },
      ...opts,
    });
  }
}
