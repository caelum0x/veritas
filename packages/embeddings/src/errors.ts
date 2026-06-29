// Domain-specific error types for the embeddings package.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class EmbeddingError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
  }
}

export class DimensionMismatchError extends AppError {
  readonly expected: number;
  readonly actual: number;

  constructor(expected: number, actual: number, options?: AppErrorOptions) {
    super(
      "VALIDATION",
      400,
      `Expected vector dimension ${expected}, got ${actual}`,
      options,
    );
    this.expected = expected;
    this.actual = actual;
  }
}

export class VectorStoreError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
  }
}

export class ChunkingError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
  }
}

export class IndexingError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
  }
}
