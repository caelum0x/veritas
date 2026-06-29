// Policy-engine-specific error classes, extending AppError conventions from @veritas/core.
import { AppError } from '@veritas/core';

/** Thrown when a referenced policy or rule id does not exist in the registry. */
export class PolicyNotFoundError extends AppError {
  constructor(policyId: string) {
    super('NOT_FOUND', 404, `Policy not found: ${policyId}`);
    this.name = 'PolicyNotFoundError';
  }
}

/** Thrown when a rule definition contains an invalid or unparseable condition/action. */
export class InvalidRuleError extends AppError {
  constructor(ruleId: string, detail: string) {
    super('VALIDATION', 422, `Invalid rule "${ruleId}": ${detail}`);
    this.name = 'InvalidRuleError';
  }
}

/** Thrown when the DSL parser encounters unexpected syntax. */
export class DslParseError extends AppError {
  readonly input: string;
  readonly position?: number;

  constructor(input: string, detail: string, position?: number) {
    super('VALIDATION', 422, `DSL parse error: ${detail}`);
    this.name = 'DslParseError';
    this.input = input;
    this.position = position;
  }
}

/** Thrown when evaluation produces an unresolvable conflict between rules. */
export class EvaluationConflictError extends AppError {
  readonly policyId: string;

  constructor(policyId: string, detail: string) {
    super('INTERNAL', 500, `Evaluation conflict in policy "${policyId}": ${detail}`);
    this.name = 'EvaluationConflictError';
    this.policyId = policyId;
  }
}

/** Thrown when a policy version mismatch is detected during concurrent updates. */
export class PolicyVersionConflictError extends AppError {
  readonly policyId: string;
  readonly expected: number;
  readonly actual: number;

  constructor(policyId: string, expected: number, actual: number) {
    super('CONFLICT', 409, `Version conflict for policy "${policyId}": expected ${expected}, got ${actual}`);
    this.name = 'PolicyVersionConflictError';
    this.policyId = policyId;
    this.expected = expected;
    this.actual = actual;
  }
}
