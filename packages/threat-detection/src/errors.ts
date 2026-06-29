// Custom error types for the threat-detection module.

import { AppError } from "@veritas/core";

export class ThreatDetectionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Threat detection error", { message, cause });
    this.name = "ThreatDetectionError";
  }
}

export class BlocklistError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("FORBIDDEN", 403, "Blocklist violation", { message, cause });
    this.name = "BlocklistError";
  }
}

export class RuleEvaluationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, "Rule evaluation error", { message, cause });
    this.name = "RuleEvaluationError";
  }
}

export class VelocityBreachError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("RATE_LIMITED", 429, "Velocity limit breached", { message, cause });
    this.name = "VelocityBreachError";
  }
}
