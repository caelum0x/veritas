// TaxCalculator port interface and default implementation using rate + jurisdiction modules.

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { TaxContext, TaxResult, TaxBreakdownLine } from "./tax.js";
import { resolveJurisdiction } from "./jurisdiction.js";
import { lookupRate } from "./rate.js";
import { determineVatApplicability, parseVatNumber } from "./vat.js";

/** Port interface — swap real impl with mock in tests or staging. */
export interface TaxCalculator {
  calculate(
    amountBaseUnits: bigint,
    ctx: TaxContext,
  ): Promise<Result<TaxResult>>;
}

/** Categories that are always exempt from tax in this platform. */
const EXEMPT_CATEGORIES = new Set(["exempt", "financial_services"] as const);

function isExemptCategory(category: string): boolean {
  return EXEMPT_CATEGORIES.has(category as "exempt" | "financial_services");
}

export class DefaultTaxCalculator implements TaxCalculator {
  async calculate(
    amountBaseUnits: bigint,
    ctx: TaxContext,
  ): Promise<Result<TaxResult>> {
    if (amountBaseUnits < 0n) {
      return err(new Error("Amount must be non-negative"));
    }

    // Exempt categories: zero tax
    if (isExemptCategory(ctx.category)) {
      return ok(buildExemptResult(amountBaseUnits, "CATEGORY_EXEMPT"));
    }

    const jurisdiction = resolveJurisdiction(ctx);

    // Reverse-charge: seller charges zero; buyer self-accounts
    if (jurisdiction.isReverseCharge) {
      return ok(buildExemptResult(amountBaseUnits, "REVERSE_CHARGE"));
    }

    const rateEntry = lookupRate(
      jurisdiction.primaryJurisdiction,
      ctx.category,
      jurisdiction.region,
    );

    // VAT-specific applicability check
    let effectiveRate = rateEntry.rate;
    if (rateEntry.taxType === "vat") {
      const vatResult = ctx.buyerVatNumber
        ? parseVatNumber(ctx.buyerVatNumber)
        : { valid: false };

      const applicability = determineVatApplicability({
        sellerCountry: ctx.sellerCountry,
        buyerCountry: ctx.buyerCountry,
        isB2B: ctx.isB2B,
        buyerVatValid: vatResult.valid,
        rate: rateEntry.rate,
      });

      if (!applicability.applyVat) {
        return ok(buildExemptResult(amountBaseUnits, "VAT_REVERSE_CHARGE"));
      }

      effectiveRate = applicability.rate;
    }

    const taxAmountBaseUnits = computeTax(amountBaseUnits, effectiveRate);
    const totalWithTaxBaseUnits = amountBaseUnits + taxAmountBaseUnits;

    const line: TaxBreakdownLine = {
      taxType: rateEntry.taxType,
      jurisdiction: jurisdiction.primaryJurisdiction,
      rate: effectiveRate,
      baseAmountBaseUnits: amountBaseUnits,
      taxAmountBaseUnits,
      description: rateEntry.description,
    };

    const result: TaxResult = {
      subtotalBaseUnits: amountBaseUnits,
      totalTaxBaseUnits: taxAmountBaseUnits,
      totalWithTaxBaseUnits,
      effectiveRate,
      lines: [line],
      isExempt: false,
      currency: "USDC",
    };

    return ok(result);
  }
}

function computeTax(baseUnits: bigint, rate: number): bigint {
  // Use integer arithmetic scaled to 1_000_000 to preserve precision
  const rateScaled = BigInt(Math.round(rate * 1_000_000));
  return (baseUnits * rateScaled) / 1_000_000n;
}

function buildExemptResult(subtotalBaseUnits: bigint, exemptionCode: string): TaxResult {
  return {
    subtotalBaseUnits,
    totalTaxBaseUnits: 0n,
    totalWithTaxBaseUnits: subtotalBaseUnits,
    effectiveRate: 0,
    lines: [],
    isExempt: true,
    exemptionCode,
    currency: "USDC",
  };
}
