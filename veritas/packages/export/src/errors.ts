// Export-specific error types extending AppError from @veritas/core
import { AppError } from "@veritas/core";
import type { ExportFormat } from "./format.js";

export class ExportError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "ExportError";
  }
}

export class UnsupportedFormatError extends AppError {
  readonly format: string;
  constructor(format: string) {
    super("VALIDATION", 400, `Unsupported export format: ${format}`);
    this.name = "UnsupportedFormatError";
    this.format = format;
  }
}

export class ExporterNotFoundError extends AppError {
  readonly format: ExportFormat;
  constructor(format: ExportFormat) {
    super("NOT_FOUND", 404, `No exporter registered for format: ${format}`);
    this.name = "ExporterNotFoundError";
    this.format = format;
  }
}

export class TemplateNotFoundError extends AppError {
  readonly templateId: string;
  constructor(templateId: string) {
    super("NOT_FOUND", 404, `Export template not found: ${templateId}`);
    this.name = "TemplateNotFoundError";
    this.templateId = templateId;
  }
}

export class SerializationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, `Serialization failed: ${message}`, { cause });
    this.name = "SerializationError";
  }
}
