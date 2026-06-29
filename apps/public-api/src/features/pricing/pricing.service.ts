// Pricing feature service: delegates to @veritas/services PricingService and @veritas/pricing-engine catalog/rules.
import { isErr, ok, err, epochToIso, newId, NotFoundError } from "@veritas/core";
import type { Result, AppError, Id } from "@veritas/core";
import { makeServiceContext } from "@veritas/services";
import type { PricingService } from "@veritas/services";
import type { ComputedPriceOutput, MonthlyEstimateOutput, PricingTableOutput } from "@veritas/services";
import {
  resolveUnitPrice,
  applyRules,
  applyDiscount,
  resolvePromoCode,
  multiplyMoney,
  subtractMoney,
  zeroPriceMoney,
} from "@veritas/pricing-engine";
import type {
  CatalogRepository,
  CatalogEntry,
  PromoCodeRepository,
  PriceQuote,
  PricingContext,
} from "@veritas/pricing-engine";
import type { ComputePriceBody, EstimateMonthlyBody } from "./pricing.schema.js";

export interface PricingFeatureServiceDeps {
  readonly pricingService: PricingService;
  readonly catalogRepository: CatalogRepository;
  readonly promoCodeRepository: PromoCodeRepository;
}

function asId(value: string): Id<string> {
  return value as unknown as Id<string>;
}

function buildContext(orgId?: string) {
  const reqId = newId("req");
  return makeServiceContext(
    {
      userId: asId("system"),
      orgId: orgId ? asId(orgId) : undefined,
      roles: ["system"],
      apiKeyId: undefined,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export class PricingFeatureService {
  private readonly pricingService: PricingService;
  private readonly catalogRepo: CatalogRepository;
  private readonly promoRepo: PromoCodeRepository;

  constructor(deps: PricingFeatureServiceDeps) {
    this.pricingService = deps.pricingService;
    this.catalogRepo = deps.catalogRepository;
    this.promoRepo = deps.promoCodeRepository;
  }

  async computePrice(body: ComputePriceBody, orgId?: string): Promise<Result<ComputedPriceOutput, AppError>> {
    const ctx = buildContext(orgId);
    return this.pricingService.computePrice(ctx, {
      planId: body.planId,
      metric: body.metric,
      quantity: body.quantity,
    });
  }

  async estimateMonthly(body: EstimateMonthlyBody, orgId?: string): Promise<Result<MonthlyEstimateOutput, AppError>> {
    const ctx = buildContext(orgId);
    return this.pricingService.estimateMonthly(ctx, {
      planId: body.planId,
      organizationId: body.organizationId,
      projectedUsage: body.projectedUsage,
    });
  }

  async getPricingTable(planId: string, orgId?: string): Promise<Result<PricingTableOutput, AppError>> {
    const ctx = buildContext(orgId);
    return this.pricingService.getPricingTable(ctx, { planId });
  }

  async buildQuote(ctx: PricingContext): Promise<Result<PriceQuote, AppError>> {
    const entry = await this.catalogRepo.findBySlug(ctx.planSlug);
    if (!entry) {
      return err(new NotFoundError({ message: `Plan '${ctx.planSlug}' not found in catalog` }) as unknown as AppError);
    }

    const unitPrice = resolveUnitPrice(entry, ctx.billingInterval);
    const subtotal = multiplyMoney(unitPrice, ctx.quantity);

    // Apply promo discount if provided.
    let discountedSubtotal = subtotal;
    if (ctx.promoCode) {
      const discountResult = await resolvePromoCode(ctx.promoCode, this.promoRepo);
      if (!isErr(discountResult)) {
        discountedSubtotal = applyDiscount(subtotal, discountResult.value);
      }
    }

    // Apply catalog rules on top of the discounted subtotal.
    const rulesResult = await applyRules(entry.rules, ctx, discountedSubtotal);
    if (isErr(rulesResult)) {
      return err(rulesResult.error as unknown as AppError);
    }

    const finalPrice = rulesResult.value.finalPrice;
    const totalDiscount = subtractMoney(subtotal, discountedSubtotal);

    // Surcharge: final exceeds original subtotal (rules added a positive delta).
    const hasSurcharge = finalPrice.amount.baseUnits > subtotal.amount.baseUnits;
    const totalSurcharge = hasSurcharge
      ? subtractMoney(finalPrice, subtotal)
      : zeroPriceMoney(unitPrice.currency);

    const lineItems: PriceQuote["lineItems"] = [
      { label: "Base price", amount: subtotal, kind: "BASE" },
      ...(totalDiscount.amount.baseUnits > 0n
        ? [{ label: "Promo discount", amount: totalDiscount, kind: "DISCOUNT" as const }]
        : []),
      ...(totalSurcharge.amount.baseUnits > 0n
        ? [{ label: "Surcharge", amount: totalSurcharge, kind: "SURCHARGE" as const }]
        : []),
    ];

    const quote: PriceQuote = {
      planSlug: ctx.planSlug,
      billingInterval: ctx.billingInterval,
      quantity: ctx.quantity,
      unitPrice,
      subtotal,
      totalDiscount,
      totalSurcharge,
      total: finalPrice,
      lineItems,
    };

    return ok(quote);
  }

  async listCatalog(): Promise<Result<readonly CatalogEntry[], AppError>> {
    const entries = await this.catalogRepo.listAll();
    return ok(entries);
  }
}
