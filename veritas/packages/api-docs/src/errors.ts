// Error types for the api-docs module.

export class ApiDocsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiDocsError";
  }
}

export class DocGenerationError extends ApiDocsError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DocGenerationError";
  }
}

export class ExampleExtractionError extends ApiDocsError {
  constructor(
    public readonly operationId: string,
    message: string,
  ) {
    super(`Failed to extract example for operation '${operationId}': ${message}`);
    this.name = "ExampleExtractionError";
  }
}

export class RenderError extends ApiDocsError {
  constructor(
    public readonly format: string,
    message: string,
  ) {
    super(`Render error (${format}): ${message}`);
    this.name = "RenderError";
  }
}

export class TocBuildError extends ApiDocsError {
  constructor(message: string) {
    super(`TOC build error: ${message}`);
    this.name = "TocBuildError";
  }
}

export class SearchIndexError extends ApiDocsError {
  constructor(message: string) {
    super(`Search index error: ${message}`);
    this.name = "SearchIndexError";
  }
}
