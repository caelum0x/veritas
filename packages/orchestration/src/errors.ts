// Orchestration-specific errors extending typed AppError subclasses.
import { NotFoundError, ConflictError, InternalError } from "@veritas/core";

export class OrchestrationNotFoundError extends NotFoundError {
  constructor(name: string) {
    super({ message: `Orchestration not found: ${name}` });
    this.name = "OrchestrationNotFoundError";
  }
}

export class OrchestrationAlreadyRegisteredError extends ConflictError {
  constructor(name: string) {
    super({ message: `Orchestration already registered: ${name}` });
    this.name = "OrchestrationAlreadyRegisteredError";
  }
}

export class OrchestrationExecutionError extends InternalError {
  constructor(name: string, cause?: unknown) {
    super({
      message: `Orchestration execution failed: ${name}`,
      cause: cause instanceof Error ? cause : undefined,
    });
    this.name = "OrchestrationExecutionError";
  }
}

export class OrchestrationScheduleError extends InternalError {
  constructor(name: string, reason: string) {
    super({ message: `Failed to schedule orchestration '${name}': ${reason}` });
    this.name = "OrchestrationScheduleError";
  }
}
