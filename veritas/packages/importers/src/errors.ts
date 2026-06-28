// Domain errors specific to the importers package.

import { AppError } from "@veritas/core";

/** Raised when a remote feed or URL cannot be fetched. */
export class FetchError extends AppError {
  readonly url: string;
  constructor(url: string, cause?: unknown) {
    super("UNAVAILABLE", 503, `Failed to fetch: ${url}`, { cause });
    this.url = url;
  }
}

/** Raised when feed parsing fails (malformed CSV / XML / JSON). */
export class ParseError extends AppError {
  readonly format: string;
  constructor(format: string, detail?: string, cause?: unknown) {
    super("VALIDATION", 422, `Failed to parse ${format}${detail ? `: ${detail}` : ""}`, { cause });
    this.format = format;
  }
}

/** Raised when no importer is registered for the requested kind. */
export class UnknownImporterError extends AppError {
  readonly kind: string;
  constructor(kind: string) {
    super("NOT_FOUND", 404, `No importer registered for kind: ${kind}`);
    this.kind = kind;
  }
}

/** Raised when a duplicate source URL is registered. */
export class DuplicateSourceError extends AppError {
  readonly sourceUrl: string;
  constructor(sourceUrl: string) {
    super("CONFLICT", 409, `Source already registered: ${sourceUrl}`);
    this.sourceUrl = sourceUrl;
  }
}

/** Raised when an item is rejected by the deduplication layer. */
export class DuplicateItemError extends AppError {
  readonly contentHash: string;
  constructor(contentHash: string) {
    super("CONFLICT", 409, `Item already imported (hash=${contentHash})`);
    this.contentHash = contentHash;
  }
}

/** Raised when the rate-control budget is exhausted for a host. */
export class RateLimitError extends AppError {
  readonly host: string;
  constructor(host: string) {
    super("RATE_LIMITED", 429, `Rate limit exceeded for host: ${host}`);
    this.host = host;
  }
}

/** Raised when field mapping cannot produce a valid domain object. */
export class MappingError extends AppError {
  readonly field: string;
  constructor(field: string, detail?: string) {
    super("VALIDATION", 422, `Mapping failed on field '${field}'${detail ? `: ${detail}` : ""}`);
    this.field = field;
  }
}
