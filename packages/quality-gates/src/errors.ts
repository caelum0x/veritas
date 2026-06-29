// Quality-gates domain errors extending AppError from @veritas/core.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Thrown when a named gate cannot be found in the registry. */
export class GateNotFoundError extends AppError {
  constructor(gateId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Quality gate not found: ${gateId}`, opts);
    this.name = "GateNotFoundError";
  }
}

/** Thrown when a gate receives input that fails structural validation. */
export class GateInputError extends AppError {
  constructor(gateId: string, detail: string, opts?: AppErrorOptions) {
    super("VALIDATION", 422, `Gate '${gateId}' input invalid: ${detail}`, opts);
    this.name = "GateInputError";
  }
}

/** Thrown when the gate pipeline encounters an unrecoverable internal failure. */
export class PipelineError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
    this.name = "PipelineError";
  }
}

/** Thrown when a duplicate gate id is registered. */
export class DuplicateGateError extends AppError {
  constructor(gateId: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Quality gate already registered: ${gateId}`, opts);
    this.name = "DuplicateGateError";
  }
}
