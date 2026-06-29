// Autoscaling-specific error types extending AppError
import { AppError } from "@veritas/core";

export class ScalingPolicyError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "ScalingPolicyError";
  }
}

export class CooldownActiveError extends AppError {
  readonly cooldownEndsAt: string;
  constructor(cooldownEndsAt: string) {
    super("RATE_LIMITED", 429, `Cooldown active until ${cooldownEndsAt}`);
    this.name = "CooldownActiveError";
    this.cooldownEndsAt = cooldownEndsAt;
  }
}

export class LimitsViolationError extends AppError {
  readonly requested: number;
  readonly min: number;
  readonly max: number;
  constructor(requested: number, min: number, max: number) {
    super(
      "VALIDATION",
      422,
      `Requested capacity ${requested} violates limits [${min}, ${max}]`,
    );
    this.name = "LimitsViolationError";
    this.requested = requested;
    this.min = min;
    this.max = max;
  }
}

export class InsufficientDataError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, message);
    this.name = "InsufficientDataError";
  }
}

export class EvaluatorError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "EvaluatorError";
  }
}
