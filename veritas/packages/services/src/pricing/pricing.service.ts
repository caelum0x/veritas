// Pricing application service: compute costs and generate price estimates for plans.
import { ok, isOk } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { PlanRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  ServiceValidationError,
} from "../errors.js";
import { serviceCall } from "../result.js";
import type {
  ComputePriceInput,
  EstimateMonthlyInput,
  GetPricingTableInput,
  ComputedPriceOutput,
  MonthlyEstimateOutput,
  PricingTableOutput,
  MetricPricing,
} from "./pricing.dto.js";

/** Dependencies required by PricingService. */
export interface PricingServiceDeps extends BaseServiceDeps {
  readonly planRepo: PlanRepository;
}

/**
 * Compute the billable cost for a given quantity using a per_unit model.
 * Included quantity is subtracted before applying the unit price.
 */
function computePerUnit(
  quantity: number,
  unitAmountCents: number,
  includedQuantity: number,
): number {
  const billable = Math.max(0, quantity - includedQuantity);
  return billable * unitAmountCents;
}

/**
 * Compute cost using tiered pricing: each tier's rate applies only to the
 * quantity consumed within that tier's range.
 */
function computeTiered(
  quantity: number,
  tiers: MetricPricing["tiers"],
  includedQuantity: number,
): number {
  if (!tiers || tiers.length === 0) return 0;
  let billable = Math.max(0, quantity - includedQuantity);
  let total = 0;
  let consumed = 0;
  for (const tier of tiers) {
    if (billable <= 0) break;
    const tierCapacity = tier.upTo !== null ? tier.upTo - consumed : Infinity;
    const inTier = Math.min(billable, tierCapacity);
    total += inTier * tier.unitAmountCents + tier.flatAmountCents;
    billable -= inTier;
    consumed += inTier;
  }
  return Math.round(total);
}

/**
 * Compute cost using volume pricing: the rate for the highest tier reached
 * applies to the entire billable quantity.
 */
function computeVolume(
  quantity: number,
  tiers: MetricPricing["tiers"],
  includedQuantity: number,
): number {
  if (!tiers || tiers.length === 0) return 0;
  const billable = Math.max(0, quantity - includedQuantity);
  // tiers is non-empty after the guard above
  let applicableTier = tiers[0]!;
  let cumulative = 0;
  for (const tier of tiers) {
    cumulative += tier.upTo ?? Infinity;
    if (billable <= cumulative) {
      applicableTier = tier;
      break;
    }
    applicableTier = tier;
  }
  return Math.round(
    billable * applicableTier.unitAmountCents + applicableTier.flatAmountCents,
  );
}

function applyPricingModel(
  metricPricing: MetricPricing,
  quantity: number,
): number {
  const { model, unitAmountCents, tiers, includedQuantity } = metricPricing;
  switch (model) {
    case "per_unit":
      return computePerUnit(quantity, unitAmountCents, includedQuantity);
    case "tiered":
      return computeTiered(quantity, tiers, includedQuantity);
    case "volume":
      return computeVolume(quantity, tiers, includedQuantity);
    case "flat":
      return unitAmountCents;
    default:
      return 0;
  }
}

/** Application service for computing pricing and generating cost estimates. */
export class PricingService extends BaseService {
  private readonly planRepo: PlanRepository;

  constructor(deps: PricingServiceDeps) {
    super(deps);
    this.planRepo = deps.planRepo;
  }

  /** Compute the cost for a specific quantity of a metric on a given plan. */
  async computePrice(
    ctx: ServiceContext,
    input: ComputePriceInput,
  ): Promise<Result<ComputedPriceOutput, AppError>> {
    this.log(ctx, "debug", "pricing.computePrice", {
      planId: input.planId,
      metric: input.metric,
      quantity: input.quantity,
    });
    return serviceCall(async () => {
      const planResult = await this.planRepo.findById(input.planId);
      if (!isOk(planResult)) {
        throw new ResourceNotFoundError("Plan", input.planId);
      }
      const plan = planResult.value;
      const metricEntry = ((plan as unknown as { pricing?: MetricPricing[] }).pricing)?.find(
        (p) => p.metric === input.metric,
      );
      if (!metricEntry) {
        throw new ServiceValidationError(
          `Plan '${input.planId}' does not include metric '${input.metric}'.`,
        );
      }
      const billable = Math.max(0, input.quantity - metricEntry.includedQuantity);
      const totalAmountCents = applyPricingModel(metricEntry, input.quantity);
      return {
        planId: input.planId,
        metric: input.metric,
        quantity: input.quantity,
        includedQuantity: metricEntry.includedQuantity,
        billableQuantity: billable,
        unitAmountCents: metricEntry.unitAmountCents,
        totalAmountCents,
        model: metricEntry.model,
      };
    });
  }

  /** Estimate the monthly cost for an organization given projected usage quantities. */
  async estimateMonthly(
    ctx: ServiceContext,
    input: EstimateMonthlyInput,
  ): Promise<Result<MonthlyEstimateOutput, AppError>> {
    this.log(ctx, "debug", "pricing.estimateMonthly", {
      planId: input.planId,
      organizationId: input.organizationId,
    });
    return serviceCall(async () => {
      const planResult = await this.planRepo.findById(input.planId);
      if (!isOk(planResult)) {
        throw new ResourceNotFoundError("Plan", input.planId);
      }
      const plan = planResult.value;
      const metricPricings = ((plan as unknown as { pricing?: MetricPricing[] }).pricing) ?? [];
      const lineItems: ComputedPriceOutput[] = [];
      for (const [metric, quantity] of Object.entries(input.projectedUsage)) {
        const metricEntry = metricPricings.find((p) => p.metric === metric);
        if (!metricEntry) continue;
        const billable = Math.max(0, quantity - metricEntry.includedQuantity);
        const totalAmountCents = applyPricingModel(metricEntry, quantity);
        lineItems.push({
          planId: input.planId,
          metric: metricEntry.metric,
          quantity,
          includedQuantity: metricEntry.includedQuantity,
          billableQuantity: billable,
          unitAmountCents: metricEntry.unitAmountCents,
          totalAmountCents,
          model: metricEntry.model,
        });
      }
      const totalAmountCents = lineItems.reduce(
        (sum, li) => sum + li.totalAmountCents,
        0,
      );
      return {
        planId: input.planId,
        organizationId: input.organizationId,
        lineItems,
        totalAmountCents,
        currency: "USD",
      };
    });
  }

  /** Retrieve the full pricing table for a plan. */
  async getPricingTable(
    ctx: ServiceContext,
    input: GetPricingTableInput,
  ): Promise<Result<PricingTableOutput, AppError>> {
    return serviceCall(async () => {
      const planResult = await this.planRepo.findById(input.planId);
      if (!isOk(planResult)) {
        throw new ResourceNotFoundError("Plan", input.planId);
      }
      const plan = planResult.value;
      return {
        planId: plan.id,
        planName: plan.name,
        baseAmountCents: (plan as unknown as { baseAmountCents?: number }).baseAmountCents ?? 0,
        billingInterval: (plan as unknown as { billingInterval?: string }).billingInterval ?? "monthly",
        metrics: ((plan as unknown as { pricing?: MetricPricing[] }).pricing) ?? [],
        currency: "USD",
      };
    });
  }
}
