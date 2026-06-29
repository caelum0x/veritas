// Redeem a coupon: validate rules, compute discount, return redemption record.
import { z } from "zod";
import { newId, type Id, type Result, ok, err, ValidationError } from "@veritas/core";
import { type Coupon, incrementRedemptions } from "./coupon.js";
import { applyDiscount } from "./discount.js";
import { evaluateRules, type RuleContext } from "./rule.js";

export type RedemptionId = Id<"redemption">;
export const newRedemptionId = (): RedemptionId => newId("redemption") as RedemptionId;

export const RedemptionSchema = z.object({
  id: z.string(),
  couponId: z.string(),
  couponCode: z.string(),
  userId: z.string(),
  orgId: z.string().optional(),
  orderId: z.string().optional(),
  originalBaseUnits: z.bigint(),
  discountedBaseUnits: z.bigint(),
  savedBaseUnits: z.bigint(),
  redeemedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type Redemption = z.infer<typeof RedemptionSchema>;

export interface RedeemInput {
  readonly coupon: Coupon;
  readonly ctx: RuleContext;
  readonly orderId?: string;
  readonly metadata?: Record<string, string>;
}

export interface RedeemOutput {
  readonly redemption: Redemption;
  readonly updatedCoupon: Coupon;
}

/** Attempt to redeem a coupon, returning a Redemption and updated Coupon on success. */
export function redeemCoupon(input: RedeemInput): Result<RedeemOutput, ValidationError> {
  const { coupon, ctx, orderId, metadata } = input;

  if (coupon.status !== "active") {
    return err(
      new ValidationError({
        message: `Coupon is not active (status: ${coupon.status})`,
        issues: [{ path: "code", message: `Coupon status is '${coupon.status}'` }],
      })
    );
  }

  const violations = evaluateRules(coupon.rule, ctx);
  if (violations.length > 0) {
    return err(
      new ValidationError({
        message: `Coupon redemption failed: ${violations.join(", ")}`,
        issues: violations.map((v) => ({ path: "rule", message: v })),
      })
    );
  }

  const nowIso = ctx.nowIso;
  const original = ctx.orderBaseUnits;
  const discounted = applyDiscount(original, coupon.discount);
  const saved = original - discounted;

  const redemption: Redemption = {
    id: newRedemptionId(),
    couponId: coupon.id,
    couponCode: coupon.code,
    userId: ctx.userId,
    orgId: ctx.orgId,
    orderId,
    originalBaseUnits: original,
    discountedBaseUnits: discounted,
    savedBaseUnits: saved,
    redeemedAt: nowIso,
    metadata,
  };

  const updatedCoupon = incrementRedemptions(coupon, nowIso);

  return ok({ redemption, updatedCoupon });
}
