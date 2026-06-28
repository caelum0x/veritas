// OpenAPI generation errors with structured context for debugging spec build failures.
import { AppError } from "@veritas/core";

export class OpenApiGenError extends AppError {
  constructor(
    message: string,
    readonly context?: Record<string, unknown>,
  ) {
    super("INTERNAL", 500, message);
  }
}

export class SchemaConversionError extends OpenApiGenError {
  constructor(typeName: string, reason: string) {
    super(`Failed to convert schema for "${typeName}": ${reason}`, {
      typeName,
      reason,
    });
  }
}

export class DuplicateRouteError extends OpenApiGenError {
  constructor(method: string, path: string) {
    super(`Duplicate route registered: ${method.toUpperCase()} ${path}`, {
      method,
      path,
    });
  }
}

export class MissingComponentError extends OpenApiGenError {
  constructor(ref: string) {
    super(`Referenced component not found: ${ref}`, { ref });
  }
}

export class InvalidPathError extends OpenApiGenError {
  constructor(path: string, reason: string) {
    super(`Invalid path "${path}": ${reason}`, { path, reason });
  }
}

export class SerializationError extends OpenApiGenError {
  constructor(format: string, reason: string) {
    super(`Serialization to ${format} failed: ${reason}`, { format, reason });
  }
}
