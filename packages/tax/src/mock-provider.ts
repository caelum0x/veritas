// Mock tax provider: in-memory implementation of TaxCalculator and VAT validation ports.

import { Result, ok, err } from "@veritas/core";
import type { TaxContext, TaxResult } from "./tax.js";
import { lookupRate } from "./rate.js";
import { resolveJurisdiction } from "./jurisdiction.js";
import { parseVatNumber, determineVatApplicability } from "./vat.js";
import { TaxCalculationError, VatValidationError } from "./errors.js";

/** Port interface for tax calculation. */
export interface TaxCalculator {
  calculate(
    amountBaseUnits: bigint,
    ctx: TaxContext
  ): Promise<Result<TaxResult, TaxCalculationError>>;
}

/** Port interface for VAT number validation (e.g., VIES). */
export interface VatValidator {
  validate(
    vatNumber: string,
    countryCode: string
  ): Promise<Result<boolean, VatValidationError>>;
}

/** Set of VAT numbers treated as valid in the mock environment. */
const MOCK_VALID_VAT_NUMBERS = new Set([
  "DE123456789",
  "FR12345678901",
  "GB123456789",
  "NL123456789B01",
  "IT12345678901",
]);

/** Mock VAT validator — accepts numbers in MOCK_VALID_VAT_NUMBERS, rejects others. */
export class MockVatValidator implements VatValidator {
  async validate(
    vatNumber: string,
    countryCode: string
  ): Promise<Result<boolean, VatValidationError>> {
    const parseResult = parseVatNumber(vatNumber);
    if (!parseResult.valid) {
      return err(new VatValidationError(vatNumber, countryCode));
    }
    const normalized = parseResult.vatNumber!.normalized;
    return ok(MOCK_VALID_VAT_NUMBERS.has(normalized));
  }
}

/** Mock tax calculator — derives tax from embedded rate tables without external calls. */
export class MockTaxCalculator implements TaxCalculator {
  async calculate(
    amountBaseUnits: bigint,
    ctx: TaxContext
  ): Promise<Result<TaxResult, TaxCalculationError>> {
    try {
      const jurisdiction = resolveJurisdiction(ctx);

      // Reverse-charge: zero tax lines but flag it
      if (jurisdiction.isReverseCharge) {
        return ok({
          subtotalBaseUnits: amountBaseUnits,
          totalTaxBaseUnits: 0n,
          totalWithTaxBaseUnits: amountBaseUnits,
          effectiveRate: 0,
          lines: [
            {
              taxType: "vat",
              jurisdiction: jurisdiction.primaryJurisdiction,
              rate: 0,
              baseAmountBaseUnits: amountBaseUnits,
              taxAmountBaseUnits: 0n,
              description: "Reverse charge: buyer accounts for VAT",
            },
          ],
          isExempt: false,
          exemptionCode: "REVERSE_CHARGE",
          currency: "USDC",
        });
      }

      const rateRecord = lookupRate(
        jurisdiction.primaryJurisdiction,
        ctx.category,
        jurisdiction.region
      );

      // Validate VAT applicability for cross-border scenarios
      let buyerVatValid = false;
      if (ctx.buyerVatNumber) {
        const parsed = parseVatNumber(ctx.buyerVatNumber);
        buyerVatValid = parsed.valid && MOCK_VALID_VAT_NUMBERS.has(
          parsed.vatNumber?.normalized ?? ""
        );
      }

      const applicability = determineVatApplicability({
        sellerCountry: ctx.sellerCountry,
        buyerCountry: ctx.buyerCountry,
        isB2B: ctx.isB2B,
        buyerVatValid,
        rate: rateRecord.rate,
      });

      if (!applicability.applyVat && applicability.reverseCharge) {
        return ok({
          subtotalBaseUnits: amountBaseUnits,
          totalTaxBaseUnits: 0n,
          totalWithTaxBaseUnits: amountBaseUnits,
          effectiveRate: 0,
          lines: [
            {
              taxType: rateRecord.taxType,
              jurisdiction: jurisdiction.primaryJurisdiction,
              rate: 0,
              baseAmountBaseUnits: amountBaseUnits,
              taxAmountBaseUnits: 0n,
              description: applicability.reason,
            },
          ],
          isExempt: false,
          exemptionCode: "REVERSE_CHARGE",
          currency: "USDC",
        });
      }

      const effectiveRate = applicability.applyVat ? applicability.rate : 0;
      const taxAmountBaseUnits =
        effectiveRate > 0
          ? BigInt(Math.round(Number(amountBaseUnits) * effectiveRate))
          : 0n;

      return ok({
        subtotalBaseUnits: amountBaseUnits,
        totalTaxBaseUnits: taxAmountBaseUnits,
        totalWithTaxBaseUnits: amountBaseUnits + taxAmountBaseUnits,
        effectiveRate,
        lines: [
          {
            taxType: rateRecord.taxType,
            jurisdiction: jurisdiction.primaryJurisdiction,
            rate: effectiveRate,
            baseAmountBaseUnits: amountBaseUnits,
            taxAmountBaseUnits,
            description: rateRecord.description,
          },
        ],
        isExempt: rateRecord.taxType === "none" || effectiveRate === 0,
        currency: "USDC",
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return err(new TaxCalculationError(message, { ctx }));
    }
  }
}

/** Factory: create a pre-wired mock tax calculator instance. */
export function createMockTaxCalculator(): TaxCalculator {
  return new MockTaxCalculator();
}

/** Factory: create a pre-wired mock VAT validator instance. */
export function createMockVatValidator(): VatValidator {
  return new MockVatValidator();
}
