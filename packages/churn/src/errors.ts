// Churn-specific error types extending AppError.
import { AppError } from '@veritas/core';

export class ChurnSignalNotFoundError extends AppError {
  constructor(userId: string) {
    super('NOT_FOUND', 404, `No churn signals found for user: ${userId}`);
    this.name = 'ChurnSignalNotFoundError';
  }
}

export class RiskScoreNotFoundError extends AppError {
  constructor(userId: string) {
    super('NOT_FOUND', 404, `No risk score found for user: ${userId}`);
    this.name = 'RiskScoreNotFoundError';
  }
}

export class InterventionNotFoundError extends AppError {
  constructor(id: string) {
    super('NOT_FOUND', 404, `Intervention not found: ${id}`);
    this.name = 'InterventionNotFoundError';
  }
}

export class InterventionAlreadyExistsError extends AppError {
  constructor(userId: string, type: string) {
    super('CONFLICT', 409, `Active intervention of type '${type}' already exists for user: ${userId}`);
    this.name = 'InterventionAlreadyExistsError';
  }
}

export class HealthScoreNotFoundError extends AppError {
  constructor(userId: string) {
    super('NOT_FOUND', 404, `No health score found for user: ${userId}`);
    this.name = 'HealthScoreNotFoundError';
  }
}

export class InvalidChurnSignalError extends AppError {
  constructor(detail: string) {
    super('VALIDATION', 400, `Invalid churn signal: ${detail}`);
    this.name = 'InvalidChurnSignalError';
  }
}

export class CohortNotFoundError extends AppError {
  constructor(cohortId: string) {
    super('NOT_FOUND', 404, `Cohort not found: ${cohortId}`);
    this.name = 'CohortNotFoundError';
  }
}
