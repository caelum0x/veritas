// Validates a coupon is eligible for redemption: status, dates, plan, and order minimum.
import { type Result, ok, err } from "@veritas/core";
import { type Coupon } from "./types.js";
import {
  CouponExpiredError,
  CouponInactiveError,
  CouponMinOrderError,
  CouponNotApplicableError,
} from "./errors.js";

export interface ValidationContext {
  readonly coupon: Coupon;
  readonly nowIso: string;
  readonly planId?: string;
  readonly orderAmountUsdcBase?: number;
}

type ValidationError =
  | CouponInactiveError
  | CouponExpiredError
  | CouponNotApplicableError
  | CouponMinOrderError;

function isWithinDateRange(coupon: Coupon, nowIso: string): boolean {
  if (coupon.startsAt !== undefined && nowIso < coupon.startsAt) return false;
  if (coupon.expiresAt !== undefined && nowIso > coupon.expiresAt) return false;
  return true;
}

function isApplicableToPlan(coupon: Coupon, planId: string | undefined): boolean {
  const { applicableTo } = coupon;
  if (applicableTo.allPlans) return true;
  if (!planId) return applicableTo.planIds === undefined || applicableTo.planIds.length === 0;
  if (applicableTo.planIds === undefined || applicableTo.planIds.length === 0) return true;
  return applicableTo.planIds.includes(planId);
}

export function validateCoupon(ctx: ValidationContext): Result<void, ValidationError> {
  const { coupon, nowIso, planId, orderAmountUsdcBase } = ctx;

  if (coupon.status === "inactive") {
    return err(new CouponInactiveError(coupon.code));
  }

  if (coupon.status === "exhausted") {
    return err(new CouponInactiveError(coupon.code));
  }

  if (coupon.status === "expired") {
    return err(new CouponExpiredError(coupon.code));
  }

  if (!isWithinDateRange(coupon, nowIso)) {
    return err(new CouponExpiredError(coupon.code));
  }

  if (!isApplicableToPlan(coupon, planId)) {
    return err(new CouponNotApplicableError(`not valid for plan ${planId ?? "unknown"}`));
  }

  if (
    coupon.minOrderAmountUsdcBase !== undefined &&
    orderAmountUsdcBase !== undefined &&
    orderAmountUsdcBase < coupon.minOrderAmountUsdcBase
  ) {
    return err(new CouponMinOrderError(coupon.minOrderAmountUsdcBase, orderAmountUsdcBase));
  }

  return ok(undefined);
}
