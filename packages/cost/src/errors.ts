// Cost-domain errors extending AppError for budget, allocation, and store failures
import { AppError, type AppErrorOptions } from "@veritas/core";

export class BudgetNotFoundError extends AppError {
  constructor(budgetId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Budget not found: ${budgetId}`, opts);
  }
}

export class BudgetExceededError extends AppError {
  constructor(tenantId: string, featureId: string, opts?: AppErrorOptions) {
    super("INTERNAL", 402, `Budget exceeded for tenant=${tenantId} feature=${featureId}`, opts);
  }
}

export class AllocationNotFoundError extends AppError {
  constructor(allocationId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Allocation not found: ${allocationId}`, opts);
  }
}

export class CostEventNotFoundError extends AppError {
  constructor(eventId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Cost event not found: ${eventId}`, opts);
  }
}

export class CostStoreError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}
