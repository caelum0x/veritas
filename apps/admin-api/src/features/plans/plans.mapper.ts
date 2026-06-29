// Maps @veritas/services PlanOutput domain objects to HTTP response shapes.
import type { PlanOutput } from "@veritas/services";

export interface PlanResponse {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly price: { readonly currency: "USDC"; readonly amount: string };
  readonly interval: string;
  readonly includedVerifications: number;
  readonly overagePrice: { readonly currency: "USDC"; readonly amount: string } | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a PlanOutput service DTO to a serializable HTTP response object. */
export function toPlanResponse(plan: PlanOutput): PlanResponse {
  return Object.freeze({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    price: plan.price,
    interval: plan.interval,
    includedVerifications: plan.includedVerifications,
    overagePrice: plan.overagePrice ?? null,
    active: plan.active,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  });
}

/** Map an array of PlanOutput to response objects. */
export function toPlanResponseList(plans: readonly PlanOutput[]): readonly PlanResponse[] {
  return Object.freeze(plans.map(toPlanResponse));
}
