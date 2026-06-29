// Tax-specific error types extending the core AppError hierarchy.

import { AppError } from "@veritas/core";

export class TaxError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("INTERNAL", 500, message, { details: context });
    this.name = "TaxError";
  }
}

export class JurisdictionNotFoundError extends TaxError {
  constructor(countryCode: string, region?: string) {
    super(
      `Tax jurisdiction not found for country "${countryCode}"${region ? `, region "${region}"` : ""}`,
      { countryCode, region }
    );
    this.name = "JurisdictionNotFoundError";
  }
}

export class ExemptionNotFoundError extends TaxError {
  constructor(exemptionId: string) {
    super(`Tax exemption not found: "${exemptionId}"`, { exemptionId });
    this.name = "ExemptionNotFoundError";
  }
}

export class ExemptionExpiredError extends TaxError {
  constructor(exemptionId: string, expiredAt: string) {
    super(`Tax exemption "${exemptionId}" expired at ${expiredAt}`, {
      exemptionId,
      expiredAt,
    });
    this.name = "ExemptionExpiredError";
  }
}

export class RegistrationNotFoundError extends TaxError {
  constructor(registrationId: string) {
    super(`Tax registration not found: "${registrationId}"`, { registrationId });
    this.name = "RegistrationNotFoundError";
  }
}

export class InvalidTaxNumberError extends TaxError {
  constructor(taxNumber: string, jurisdiction: string) {
    super(
      `Invalid tax number "${taxNumber}" for jurisdiction "${jurisdiction}"`,
      { taxNumber, jurisdiction }
    );
    this.name = "InvalidTaxNumberError";
  }
}

export class TaxCalculationError extends TaxError {
  constructor(detail: string, context?: Record<string, unknown>) {
    super(`Tax calculation failed: ${detail}`, context);
    this.name = "TaxCalculationError";
  }
}

export class VatValidationError extends TaxError {
  constructor(vatNumber: string, countryCode: string) {
    super(
      `VAT number "${vatNumber}" is invalid for country "${countryCode}"`,
      { vatNumber, countryCode }
    );
    this.name = "VatValidationError";
  }
}
