// Core coupon entity: creation, status, and immutable update helpers.
import { z } from "zod";
import { newId, type Id } from "@veritas/core";
import { CouponCodeSchema } from "./code.js";
import { DiscountSchema } from "./discount.js";
import { RedemptionRuleSchema } from "./rule.js";

export type CouponId = Id<"coupon">;
export const newCouponId = (): CouponId => newId("coupon") as CouponId;

export const CouponStatusSchema = z.enum(["active", "paused", "expired", "exhausted"]);
export type CouponStatus = z.infer<typeof CouponStatusSchema>;

export const CouponSchema = z.object({
  id: z.string(),
  code: CouponCodeSchema,
  description: z.string().max(256).optional(),
  discount: DiscountSchema,
  rule: RedemptionRuleSchema,
  status: CouponStatusSchema,
  campaignId: z.string().optional(),
  totalRedemptions: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CreateCouponInputSchema = z.object({
  code: CouponCodeSchema,
  description: z.string().max(256).optional(),
  discount: DiscountSchema,
  rule: RedemptionRuleSchema,
  campaignId: z.string().optional(),
});
export type CreateCouponInput = z.infer<typeof CreateCouponInputSchema>;

/** Create a new Coupon entity from validated input. */
export function createCoupon(input: CreateCouponInput, nowIso: string): Coupon {
  return {
    id: newCouponId(),
    code: input.code,
    description: input.description,
    discount: input.discount,
    rule: input.rule,
    status: "active",
    campaignId: input.campaignId,
    totalRedemptions: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/** Return a new Coupon with incremented redemption count and auto-exhaustion. */
export function incrementRedemptions(coupon: Coupon, nowIso: string): Coupon {
  const next = coupon.totalRedemptions + 1;
  const maxTotal = coupon.rule.usage?.maxTotalRedemptions;
  const status: CouponStatus =
    maxTotal !== undefined && next >= maxTotal ? "exhausted" : coupon.status;
  return { ...coupon, totalRedemptions: next, status, updatedAt: nowIso };
}

/** Return a new Coupon with updated status. */
export function setCouponStatus(coupon: Coupon, status: CouponStatus, nowIso: string): Coupon {
  return { ...coupon, status, updatedAt: nowIso };
}
