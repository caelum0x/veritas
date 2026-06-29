// Domain errors for the data-classification module

import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
  ForbiddenError,
} from "@veritas/core";

export class ClassificationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Data asset not found: ${id}`, details: { id } });
    this.name = "ClassificationNotFoundError";
  }
}

export class DataFlowNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Data flow not found: ${id}`, details: { id } });
    this.name = "DataFlowNotFoundError";
  }
}

export class ClassificationConflictError extends ConflictError {
  constructor(name: string) {
    super({ message: `Data asset already exists: ${name}`, details: { name } });
    this.name = "ClassificationConflictError";
  }
}

export class InvalidClassificationError extends ValidationError {
  constructor(reason: string) {
    super({ message: `Invalid classification: ${reason}`, details: { reason } });
    this.name = "InvalidClassificationError";
  }
}

export class PolicyViolationError extends ForbiddenError {
  constructor(policy: string, reason: string) {
    super({ message: `Policy violation [${policy}]: ${reason}`, details: { policy, reason } });
    this.name = "PolicyViolationError";
  }
}

export class UnencryptedFlowError extends ForbiddenError {
  constructor(flowId: string, classification: string) {
    super({
      message: `Data flow ${flowId} carries ${classification} data but is not encrypted`,
      details: { flowId, classification },
    });
    this.name = "UnencryptedFlowError";
  }
}

/** Typed error produced by the classifier when rule evaluation fails. */
export class ClassifierError extends InternalError {
  constructor(message: string, cause?: unknown) {
    super({ message, cause });
    this.name = "ClassifierError";
  }
}

/** Factory for ClassifierError — used by classifier.ts. */
export function makeClassifierError(message: string, cause?: unknown): ClassifierError {
  return new ClassifierError(message, cause);
}
