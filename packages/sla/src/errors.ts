// SLA-specific error types extending AppError hierarchy.
import { AppError } from "@veritas/core";

export class SlaNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `SLA not found: ${id}`);
    this.name = "SlaNotFoundError";
  }
}

export class SlaTargetNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `SLA target not found: ${id}`);
    this.name = "SlaTargetNotFoundError";
  }
}

export class SlaBreachNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `SLA breach not found: ${id}`);
    this.name = "SlaBreachNotFoundError";
  }
}

export class SlaPolicyNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `SLA policy not found: ${id}`);
    this.name = "SlaPolicyNotFoundError";
  }
}

export class SlaConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", 409, message);
    this.name = "SlaConflictError";
  }
}

export class SlaValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, message);
    this.name = "SlaValidationError";
  }
}

export class SlaEvaluationError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, message);
    this.name = "SlaEvaluationError";
  }
}
