// Maps @veritas/pricing-engine and @veritas/services domain objects to HTTP response DTOs.
import type { PriceQuote, QuoteLineItem, PriceMoney, CatalogEntry } from "@veritas/pricing-engine";
import type { ComputedPriceOutput, MonthlyEstimateOutput, PricingTableOutput } from "@veritas/services";

export interface PriceMoneyDto {
  readonly currency: string;
  readonly amount: string;
}

export interface QuoteLineItemDto {
  readonly label: string;
  readonly amount: PriceMoneyDto;
  readonly kind: "BASE" | "DISCOUNT" | "SURCHARGE" | "TAX";
}

export interface PriceQuoteDto {
  readonly planSlug: string;
  readonly billingInterval: "MONTHLY" | "YEARLY";
  readonly quantity: number;
  readonly unitPrice: PriceMoneyDto;
  readonly subtotal: PriceMoneyDto;
  readonly totalDiscount: PriceMoneyDto;
  readonly totalSurcharge: PriceMoneyDto;
  readonly total: PriceMoneyDto;
  readonly lineItems: readonly QuoteLineItemDto[];
}

export interface CatalogEntryDto {
  readonly planSlug: string;
  readonly displayName: string;
  readonly monthlyUnitPrice: PriceMoneyDto;
  readonly yearlyUnitPrice: PriceMoneyDto;
  readonly currency: string;
}

function toPriceMoneyDto(m: PriceMoney): PriceMoneyDto {
  return { currency: m.currency, amount: m.amount.baseUnits.toString() };
}

function toQuoteLineItemDto(line: QuoteLineItem): QuoteLineItemDto {
  return { label: line.label, amount: toPriceMoneyDto(line.amount), kind: line.kind };
}

export function toPriceQuoteDto(quote: PriceQuote): PriceQuoteDto {
  return {
    planSlug: quote.planSlug,
    billingInterval: quote.billingInterval,
    quantity: quote.quantity,
    unitPrice: toPriceMoneyDto(quote.unitPrice),
    subtotal: toPriceMoneyDto(quote.subtotal),
    totalDiscount: toPriceMoneyDto(quote.totalDiscount),
    totalSurcharge: toPriceMoneyDto(quote.totalSurcharge),
    total: toPriceMoneyDto(quote.total),
    lineItems: quote.lineItems.map(toQuoteLineItemDto),
  };
}

export function toCatalogEntryDto(entry: CatalogEntry): CatalogEntryDto {
  return {
    planSlug: entry.planSlug,
    displayName: entry.displayName,
    monthlyUnitPrice: { currency: entry.currency, amount: entry.monthlyUnitPriceBaseUnits.toString() },
    yearlyUnitPrice: { currency: entry.currency, amount: entry.yearlyUnitPriceBaseUnits.toString() },
    currency: entry.currency,
  };
}

export function toComputedPriceDto(out: ComputedPriceOutput): ComputedPriceOutput {
  return { ...out };
}

export function toMonthlyEstimateDto(out: MonthlyEstimateOutput): MonthlyEstimateOutput {
  return { ...out };
}

export function toPricingTableDto(out: PricingTableOutput): PricingTableOutput {
  return { ...out };
}
