// Public surface re-export for @veritas/tax
// tax.ts is canonical for TaxCategory/TaxContext (used by the calculator);
// registration.ts owns TaxRegistration, calculator.ts owns the TaxCalculator port.
export {
  TaxCategorySchema,
  TaxCategory,
  TaxTypeSchema,
  TaxType,
  TaxBreakdownLineSchema,
  TaxBreakdownLine,
  TaxResultSchema,
  TaxResult,
  TaxContextSchema,
  TaxContext,
} from "./tax.js";
export * from "./calculator.js";
export * from "./rate.js";
export * from "./jurisdiction.js";
export * from "./vat.js";
export * from "./exemption.js";
export {
  VatValidator,
  MockVatValidator,
  MockTaxCalculator,
  createMockTaxCalculator,
  createMockVatValidator,
} from "./mock-provider.js";
export * from "./registration.js";
export * from "./errors.js";
export {
  ExemptionTypeSchema,
  ExemptionType,
  TaxAddressSchema,
  TaxAddress,
  TaxBreakdownSchema,
  TaxBreakdown,
  TaxLineSchema,
  TaxLine,
  TaxRegistrationStatusSchema,
  TaxRegistrationStatus,
} from "./types.js";
