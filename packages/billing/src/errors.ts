// Billing-specific error types extending the core AppError hierarchy.

import { AppError } from "@veritas/core";

export class BillingError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
  }
}

export class QuotaExceededError extends BillingError {
  constructor(
    metric: string,
    used: number,
    limit: number,
    organizationId: string
  ) {
    super(
      `Quota exceeded for metric "${metric}": used ${used}, limit ${limit}`,
      { metric, used, limit, organizationId }
    );
    this.name = "QuotaExceededError";
  }
}

export class InsufficientFundsError extends BillingError {
  constructor(required: bigint, available: bigint, organizationId: string) {
    super(
      `Insufficient funds: required ${required} base units, available ${available}`,
      { required: required.toString(), available: available.toString(), organizationId }
    );
    this.name = "InsufficientFundsError";
  }
}

export class PlanNotFoundError extends BillingError {
  constructor(planId: string) {
    super(`Billing plan not found: "${planId}"`, { planId });
    this.name = "PlanNotFoundError";
  }
}

export class InvoiceAlreadyFinalizedError extends BillingError {
  constructor(invoiceId: string) {
    super(`Invoice "${invoiceId}" is already finalized and cannot be modified`, {
      invoiceId,
    });
    this.name = "InvoiceAlreadyFinalizedError";
  }
}

export class SettlementMismatchError extends BillingError {
  constructor(expected: bigint, actual: bigint, orderId: string) {
    super(
      `Settlement amount mismatch for order "${orderId}": expected ${expected}, got ${actual}`,
      {
        expected: expected.toString(),
        actual: actual.toString(),
        orderId,
      }
    );
    this.name = "SettlementMismatchError";
  }
}

export class LedgerIntegrityError extends BillingError {
  constructor(detail: string) {
    super(`Ledger integrity violation: ${detail}`, { detail });
    this.name = "LedgerIntegrityError";
  }
}
