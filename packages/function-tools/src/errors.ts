// Typed errors for the function-tools package tool dispatch and execution layer.

import { AppError } from "@veritas/core";

/** Raised when a tool name is not found in the registry. */
export class ToolNotFoundError extends AppError {
  constructor(name: string) {
    super("NOT_FOUND", 404, "Tool not found", { message: `Tool not found: ${name}` });
    this.name = "ToolNotFoundError";
  }
}

/** Raised when tool input fails schema validation. */
export class ToolInputError extends AppError {
  constructor(toolName: string, detail: string) {
    super("VALIDATION", 400, "Tool input invalid", {
      message: `Invalid input for tool "${toolName}": ${detail}`,
    });
    this.name = "ToolInputError";
  }
}

/** Raised when a tool handler throws or returns an unexpected error. */
export class ToolExecutionError extends AppError {
  constructor(toolName: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super("INTERNAL", 500, "Tool execution failed", {
      message: `Tool "${toolName}" execution failed: ${detail}`,
      cause,
    });
    this.name = "ToolExecutionError";
  }
}

/** Raised when an unsupported output format is requested. */
export class UnsupportedFormatError extends AppError {
  constructor(format: string) {
    super("VALIDATION", 400, "Unsupported format", {
      message: `Unsupported tool format: ${format}`,
    });
    this.name = "UnsupportedFormatError";
  }
}

