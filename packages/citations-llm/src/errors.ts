// Domain errors for citations-llm package.

import { AppError } from "@veritas/core";

export class CitationExtractionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Citation extraction failed", { message, cause });
    this.name = "CitationExtractionError";
  }
}

export class CitationValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION", 422, "Citation validation failed", { message, cause });
    this.name = "CitationValidationError";
  }
}

export class CitationFormattingError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Citation formatting failed", { message, cause });
    this.name = "CitationFormattingError";
  }
}

export class CitationGroundingError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Citation grounding failed", { message, cause });
    this.name = "CitationGroundingError";
  }
}

export class SourceNotFoundError extends AppError {
  constructor(sourceId: string) {
    super("NOT_FOUND", 404, "Source not found", { message: `Source not found: ${sourceId}` });
    this.name = "SourceNotFoundError";
  }
}

export class DuplicateCitationError extends AppError {
  constructor(hash: string) {
    super("CONFLICT", 409, "Duplicate citation detected", { message: `Duplicate citation detected: ${hash}` });
    this.name = "DuplicateCitationError";
  }
}
