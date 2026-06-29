// Ingestion-specific error classes extending the core AppError hierarchy.

import { AppError, ValidationError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

export class IngestionError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("INTERNAL", 500, message, options);
  }
}

export class UnsupportedMimeTypeError extends AppError {
  readonly mimeType: string;

  constructor(mimeType: string, options: AppErrorOptions = {}) {
    super(
      "VALIDATION",
      415,
      `Unsupported MIME type: ${mimeType}`,
      { ...options, details: { mimeType, ...options.details } },
    );
    this.mimeType = mimeType;
  }
}

export class ExtractionFailedError extends AppError {
  readonly url: string;

  constructor(url: string, options: AppErrorOptions = {}) {
    super(
      "INTERNAL",
      500,
      `Content extraction failed for: ${url}`,
      { ...options, details: { url, ...options.details } },
    );
    this.url = url;
  }
}

export class FetchFailedError extends AppError {
  readonly url: string;
  readonly statusCode?: number;

  constructor(url: string, statusCode?: number, options: AppErrorOptions = {}) {
    const message = statusCode != null
      ? `Fetch failed for ${url} (HTTP ${statusCode})`
      : `Fetch failed for ${url}`;
    super(
      "UNAVAILABLE",
      502,
      message,
      { ...options, details: { url, statusCode, ...options.details } },
    );
    this.url = url;
    this.statusCode = statusCode;
  }
}

export class DocumentTooLargeError extends AppError {
  readonly byteSize: number;
  readonly maxBytes: number;

  constructor(byteSize: number, maxBytes: number, options: AppErrorOptions = {}) {
    super(
      "VALIDATION",
      413,
      `Document size ${byteSize} bytes exceeds limit of ${maxBytes} bytes`,
      { ...options, details: { byteSize, maxBytes, ...options.details } },
    );
    this.byteSize = byteSize;
    this.maxBytes = maxBytes;
  }
}

export class LanguageDetectionError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("INTERNAL", 500, "Language detection failed", options);
  }
}

export class JobNotFoundError extends AppError {
  readonly jobId: string;

  constructor(jobId: string, options: AppErrorOptions = {}) {
    super(
      "NOT_FOUND",
      404,
      `Ingestion job not found: ${jobId}`,
      { ...options, details: { jobId, ...options.details } },
    );
    this.jobId = jobId;
  }
}

export class InvalidSourceUrlError extends ValidationError {
  constructor(url: string, options: AppErrorOptions = {}) {
    super({
      message: `Invalid source URL: ${url}`,
      ...options,
      details: { url, ...options.details },
    });
  }
}
