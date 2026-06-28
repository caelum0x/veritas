// Domain-specific errors for the lifecycle module.
import { NotFoundError, ConflictError, ValidationError } from "@veritas/core";

export class StageNotFoundError extends NotFoundError {
  constructor(stageId: string) {
    super({ message: `Lifecycle stage not found: ${stageId}`, details: { stageId } });
    this.name = "StageNotFoundError";
  }
}

export class TransitionNotFoundError extends NotFoundError {
  constructor(transitionId: string) {
    super({ message: `Lifecycle transition not found: ${transitionId}`, details: { transitionId } });
    this.name = "TransitionNotFoundError";
  }
}

export class JourneyNotFoundError extends NotFoundError {
  constructor(journeyId: string) {
    super({ message: `Lifecycle journey not found: ${journeyId}`, details: { journeyId } });
    this.name = "JourneyNotFoundError";
  }
}

export class TransitionDeniedError extends ConflictError {
  constructor(from: string, to: string, reason?: string) {
    super({
      message: reason
        ? `Lifecycle transition denied: ${from} -> ${to}. ${reason}`
        : `Lifecycle transition denied: ${from} -> ${to}`,
      details: { from, to, ...(reason ? { reason } : {}) },
    });
    this.name = "TransitionDeniedError";
  }
}

export class InvalidTransitionError extends ValidationError {
  constructor(from: string, to: string) {
    super({
      message: `No valid transition from stage '${from}' to stage '${to}'`,
      details: { from, to },
    });
    this.name = "InvalidTransitionError";
  }
}

export class JourneyAlreadyTerminatedError extends ConflictError {
  constructor(journeyId: string, phase: string) {
    super({
      message: `Journey '${journeyId}' is already in terminal phase '${phase}'`,
      details: { journeyId, phase },
    });
    this.name = "JourneyAlreadyTerminatedError";
  }
}

export class RuleEvaluationError extends ValidationError {
  constructor(ruleId: string, cause: unknown) {
    super({
      message: `Rule '${ruleId}' evaluation failed`,
      details: { ruleId },
      cause,
    });
    this.name = "RuleEvaluationError";
  }
}
