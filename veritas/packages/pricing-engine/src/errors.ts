// Pricing-engine domain errors extending AppError.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class PricingError extends AppError {
  constructor(opts: AppErrorOptions = {}) {
    super("INTERNAL", 500, "Pricing error", opts);
  }
}

export class InvalidPromoCodeError extends AppError {
  constructor(code: string) {
    super("VALIDATION", 422, `Promo code "${code}" is invalid or expired`);
  }
}

export class CurrencyMismatchError extends AppError {
  constructor(a: string, b: string) {
    super("VALIDATION", 422, `Currency mismatch: ${a} vs ${b}`);
  }
}

export class NegativePriceError extends AppError {
  constructor(amount: string) {
    super("VALIDATION", 422, `Price must be non-negative, got ${amount}`);
  }
}

export class CatalogEntryNotFoundError extends AppError {
  constructor(planSlug: string) {
    super("NOT_FOUND", 404, `No catalog entry found for plan "${planSlug}"`);
  }
}

export class RuleEngineError extends AppError {
  constructor(ruleName: string, cause?: unknown) {
    super(
      "INTERNAL",
      500,
      `Rule "${ruleName}" failed during evaluation`,
      { cause: cause instanceof Error ? cause : undefined },
    );
  }
}
