// Search-specific error types extending AppError conventions.
import { AppError } from "@veritas/core";

export class SearchIndexError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Search index error", { message, cause });
    this.name = "SearchIndexError";
  }
}

export class SearchQueryError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION", 400, "Search query error", { message, cause });
    this.name = "SearchQueryError";
  }
}

export class DocumentNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Document not found: ${id}`);
    this.name = "DocumentNotFoundError";
  }
}
