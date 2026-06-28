// Price calculator: orchestrates rules, promos, and tiers into a final quote.

import { type Result, ok, err, Usdc } from "@veritas/core";
import { type PricingContext, priceMoney, zeroPriceMoney } from "./types.js";
import { type PriceMoney } from "./types.js";
import { type PriceRule } from "./price-rule.js";
import { type Discount, applyDiscount, totalDiscount as computeTotalDiscount } from "./discount.js";
import { type PromoCodeRepository, resolvePromoCode } from "./promo-code.js";
import { addMoney, subtractMoney } from "./currency.js";
import { buildQuote, type Quote, type QuoteInput } from "./quote.js";
import { type AppError } from "@veritas/core";

/** Catalog entry supplying the base price for a plan/interval combination. */
export interface CatalogEntry {
  readonly planSlug: string;
  readonly billingInterval: "MONTHLY" | "YEARLY";
  /** Per-unit base price. */
  readonly unitPrice: PriceMoney;
}

/** Port: retrieve the catalog entry for a given pricing context. */
export interface PriceCatalog {
  findEntry(ctx: PricingContext): Promise<CatalogEntry | undefined>;
}

/** In-memory catalog for local dev and tests. */
export class InMemoryPriceCatalog implements PriceCatalog {
  private readonly entries: readonly CatalogEntry[];

  constructor(entries: readonly CatalogEntry[]) {
    this.entries = entries;
  }

  async findEntry(ctx: PricingContext): Promise<CatalogEntry | undefined> {
    return this.entries.find(
      (e) => e.planSlug === ctx.planSlug && e.billingInterval === ctx.billingInterval,
    );
  }
}

export interface CalculatorDeps {
  readonly catalog: PriceCatalog;
  readonly rules: readonly PriceRule[];
  readonly promoRepo?: PromoCodeRepository | undefined;
}

/** Compute a full Quote for the given PricingContext. */
export async function calculatePrice(
  ctx: PricingContext,
  deps: CalculatorDeps,
): Promise<Result<Quote, AppError>> {
  const entry = await deps.catalog.findEntry(ctx);
  if (!entry) {
    const { CatalogEntryNotFoundError } = await import("./errors.js");
    return err(new CatalogEntryNotFoundError(ctx.planSlug));
  }

  // Subtotal = unitPrice * quantity
  const subtotal = priceMoney(
    entry.unitPrice.amount.multiply(BigInt(ctx.quantity)),
    entry.unitPrice.currency,
  );

  // Apply rules in priority order, collecting discounts
  const sortedRules = [...deps.rules].sort((a, b) => a.priority - b.priority);
  const appliedDiscounts: (Discount & { reduction: PriceMoney })[] = [];
  let runningPrice = subtotal;

  for (const rule of sortedRules) {
    const { price: newPrice, discount } = rule.apply(runningPrice, ctx);
    runningPrice = newPrice;
    if (discount) appliedDiscounts.push(discount);
  }

  // Apply promo code if present
  if (ctx.promoCode && deps.promoRepo) {
    const promoResult = await resolvePromoCode(ctx.promoCode, deps.promoRepo);
    if (promoResult.ok) {
      const promoDiscount = promoResult.value;
      const before = runningPrice;
      runningPrice = applyDiscount(runningPrice, promoDiscount);
      const reduction = subtractMoney(before, runningPrice);
      appliedDiscounts.push({ ...promoDiscount, reduction });
    }
    // Non-fatal: invalid promo simply not applied
  }

  // Build line items
  const lineItems: Array<{ label: string; amount: PriceMoney }> = [
    { label: `${ctx.planSlug} × ${ctx.quantity}`, amount: subtotal },
    ...appliedDiscounts.map((d) => ({
      label: d.label ?? (d.kind === "PERCENTAGE" ? `${d.value}% off` : "Discount"),
      amount: priceMoney(
        Usdc.fromBaseUnits(-d.reduction.amount.baseUnits),
        d.reduction.currency,
      ),
    })),
  ];

  const input: QuoteInput = {
    planSlug: ctx.planSlug,
    billingInterval: ctx.billingInterval,
    quantity: ctx.quantity,
    subtotal,
    discounts: appliedDiscounts,
    total: runningPrice,
    lineItems,
    promoCode: ctx.promoCode,
  };

  return ok(buildQuote(input));
}
