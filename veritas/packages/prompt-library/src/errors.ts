// Prompt-library domain errors — typed error classes for prompt operations.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class PromptNotFoundError extends AppError {
  constructor(promptId: string, opts: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Prompt not found: ${promptId}`, opts);
    this.name = "PromptNotFoundError";
  }
}

export class PromptVersionNotFoundError extends AppError {
  constructor(promptId: string, version: string, opts: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Prompt version not found: ${promptId}@${version}`, opts);
    this.name = "PromptVersionNotFoundError";
  }
}

export class PromptRenderError extends AppError {
  constructor(promptId: string, reason: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Failed to render prompt ${promptId}: ${reason}`, opts);
    this.name = "PromptRenderError";
  }
}

export class PromptValidationError extends AppError {
  constructor(reason: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Prompt validation failed: ${reason}`, opts);
    this.name = "PromptValidationError";
  }
}

export class PartialNotFoundError extends AppError {
  constructor(partialName: string, opts: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Prompt partial not found: ${partialName}`, opts);
    this.name = "PartialNotFoundError";
  }
}

export class PromptConflictError extends AppError {
  constructor(promptId: string, opts: AppErrorOptions = {}) {
    super("CONFLICT", 409, `Prompt already registered: ${promptId}`, opts);
    this.name = "PromptConflictError";
  }
}
