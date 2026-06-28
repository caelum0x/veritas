// Domain errors for the agent-card package — typed errors for card operations.

import { AppError } from "@veritas/core";

export class CardValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION", 422, "Agent card validation failed", { message, cause });
    this.name = "CardValidationError";
  }
}

export class CardPublishError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("UNAVAILABLE", 502, "Agent card publish failed", { message, cause });
    this.name = "CardPublishError";
  }
}

export class CardNotFoundError extends AppError {
  constructor(agentId: string) {
    super("NOT_FOUND", 404, "Agent card not found", { message: `Agent card not found: ${agentId}` });
    this.name = "CardNotFoundError";
  }
}

export class CardRegistryUnavailableError extends AppError {
  constructor(registryUrl: string, cause?: unknown) {
    super("UNAVAILABLE", 503, "Agent card registry unavailable", {
      message: `Agent card registry unavailable: ${registryUrl}`,
      cause,
    });
    this.name = "CardRegistryUnavailableError";
  }
}
