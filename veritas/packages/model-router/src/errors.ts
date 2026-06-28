// Model-router specific error types extending AppError
import { AppError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

/** No suitable model found for the given task constraints */
export class NoModelAvailableError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("INTERNAL", 500, "No suitable model available", opts);
    this.name = "NoModelAvailableError";
  }
}

/** Routing policy rejected the task (e.g., budget exceeded, unsupported kind) */
export class RoutingPolicyError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("INTERNAL", 500, "Routing policy rejected the task", opts);
    this.name = "RoutingPolicyError";
  }
}

/** All entries in a fallback chain were exhausted */
export class FallbackExhaustedError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("UNAVAILABLE", 503, "All fallback chain entries exhausted", opts);
    this.name = "FallbackExhaustedError";
  }
}
