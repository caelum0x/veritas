// Feature flag domain errors extending AppError hierarchy
import { AppError, type AppErrorOptions } from "@veritas/core";

export class FlagNotFoundError extends AppError {
  constructor(flagKey: string, opts?: Omit<AppErrorOptions, "message">) {
    super("NOT_FOUND", 404, "Feature flag not found", {
      ...opts,
      message: `Feature flag not found: ${flagKey}`,
    });
    this.name = "FlagNotFoundError";
  }
}

export class FlagEvaluationError extends AppError {
  constructor(flagKey: string, reason: string, opts?: Omit<AppErrorOptions, "message">) {
    super("INTERNAL", 500, "Flag evaluation error", {
      ...opts,
      message: `Failed to evaluate flag "${flagKey}": ${reason}`,
    });
    this.name = "FlagEvaluationError";
  }
}

export class InvalidRuleError extends AppError {
  constructor(detail: string, opts?: Omit<AppErrorOptions, "message">) {
    super("VALIDATION", 400, "Invalid targeting rule", {
      ...opts,
      message: `Invalid targeting rule: ${detail}`,
    });
    this.name = "InvalidRuleError";
  }
}

export class ProviderError extends AppError {
  constructor(detail: string, opts?: Omit<AppErrorOptions, "message">) {
    super("UNAVAILABLE", 503, "Flag provider error", {
      ...opts,
      message: `Flag provider error: ${detail}`,
    });
    this.name = "ProviderError";
  }
}

export class RegistryError extends AppError {
  constructor(detail: string, opts?: Omit<AppErrorOptions, "message">) {
    super("INTERNAL", 500, "Flag registry error", {
      ...opts,
      message: `Flag registry error: ${detail}`,
    });
    this.name = "RegistryError";
  }
}
