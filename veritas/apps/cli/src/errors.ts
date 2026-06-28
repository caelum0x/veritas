// CLI-specific error types and formatting utilities
import { AppError, isAppError } from "@veritas/core";

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export class ConfigError extends CliError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 78);
    this.name = "ConfigError";
  }
}

export class ApiError extends CliError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(`API error (${statusCode}): ${message}`, 1);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export class NotFoundCliError extends CliError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 1);
    this.name = "NotFoundCliError";
  }
}

export class UnauthorizedCliError extends CliError {
  constructor() {
    super("Unauthorized: set VERITAS_API_KEY or pass --api-key", 1);
    this.name = "UnauthorizedCliError";
  }
}

export function formatError(error: unknown): string {
  if (error instanceof CliError) {
    return error.message;
  }
  if (isAppError(error)) {
    return formatAppError(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function formatAppError(error: AppError): string {
  const base = `[${error.code}] ${error.message}`;
  if (error.details !== undefined && "fields" in error.details) {
    const fields = error.details.fields;
    if (Array.isArray(fields) && fields.length > 0) {
      const fieldMessages = fields
        .map((f: { path: string; message: string }) => `  • ${f.path}: ${f.message}`)
        .join("\n");
      return `${base}\n${fieldMessages}`;
    }
  }
  return base;
}

export function exitCodeFrom(error: unknown): number {
  if (error instanceof CliError) return error.exitCode;
  return 1;
}
