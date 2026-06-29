// Affiliate-specific error types extending the core AppError hierarchy.

import { AppError } from "@veritas/core";

export class AffiliateError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
    this.name = "AffiliateError";
  }
}

export class AffiliateNotFoundError extends AffiliateError {
  constructor(affiliateId: string) {
    super(`Affiliate not found: "${affiliateId}"`, { affiliateId });
    this.name = "AffiliateNotFoundError";
  }
}

export class AffiliateLinkNotFoundError extends AffiliateError {
  constructor(linkId: string) {
    super(`Affiliate link not found: "${linkId}"`, { linkId });
    this.name = "AffiliateLinkNotFoundError";
  }
}

export class AffiliateClickNotFoundError extends AffiliateError {
  constructor(clickId: string) {
    super(`Affiliate click not found: "${clickId}"`, { clickId });
    this.name = "AffiliateClickNotFoundError";
  }
}

export class AffiliateSaleNotFoundError extends AffiliateError {
  constructor(saleId: string) {
    super(`Affiliate sale not found: "${saleId}"`, { saleId });
    this.name = "AffiliateSaleNotFoundError";
  }
}

export class AffiliatePayoutNotFoundError extends AffiliateError {
  constructor(payoutId: string) {
    super(`Affiliate payout not found: "${payoutId}"`, { payoutId });
    this.name = "AffiliatePayoutNotFoundError";
  }
}

export class AffiliateStatementNotFoundError extends AffiliateError {
  constructor(statementId: string) {
    super(`Affiliate statement not found: "${statementId}"`, { statementId });
    this.name = "AffiliateStatementNotFoundError";
  }
}

export class DuplicateClickError extends AffiliateError {
  constructor(linkId: string, visitorId: string) {
    super(`Duplicate click for link "${linkId}" from visitor "${visitorId}"`, {
      linkId,
      visitorId,
    });
    this.name = "DuplicateClickError";
  }
}

export class AttributionWindowExpiredError extends AffiliateError {
  constructor(clickId: string, windowDays: number) {
    super(
      `Attribution window of ${windowDays} days expired for click "${clickId}"`,
      { clickId, windowDays }
    );
    this.name = "AttributionWindowExpiredError";
  }
}

export class InvalidCommissionRateError extends AffiliateError {
  constructor(rate: number) {
    super(`Invalid commission rate: ${rate}. Must be between 0 and 1.`, {
      rate,
    });
    this.name = "InvalidCommissionRateError";
  }
}

export class AffiliateAlreadyActiveError extends AffiliateError {
  constructor(affiliateId: string) {
    super(`Affiliate "${affiliateId}" is already active`, { affiliateId });
    this.name = "AffiliateAlreadyActiveError";
  }
}

export class AffiliateSuspendedError extends AffiliateError {
  constructor(affiliateId: string) {
    super(`Affiliate "${affiliateId}" is suspended`, { affiliateId });
    this.name = "AffiliateSuspendedError";
  }
}
