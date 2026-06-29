// Usage limit checking for coupons: total, per-user, and per-day constraints.
import { type Result, ok, err } from "@veritas/core";
import { type Coupon, type Redemption } from "./types.js";
import { CouponUsageLimitError, CouponAlreadyRedeemedError } from "./errors.js";

export interface LimitCheckContext {
  readonly coupon: Coupon;
  readonly userId: string;
  readonly redemptions: ReadonlyArray<Redemption>;
  readonly nowIso: string;
}

function countByUser(redemptions: ReadonlyArray<Redemption>, userId: string): number {
  return redemptions.filter((r) => r.userId === userId).length;
}

function countToday(redemptions: ReadonlyArray<Redemption>, nowIso: string): number {
  const today = nowIso.slice(0, 10);
  return redemptions.filter((r) => r.redeemedAt.slice(0, 10) === today).length;
}

export function checkUsageLimits(
  ctx: LimitCheckContext,
): Result<void, CouponUsageLimitError | CouponAlreadyRedeemedError> {
  const { coupon, userId, redemptions, nowIso } = ctx;
  const { usageLimit, redeemedCount, code } = coupon;

  if (usageLimit.maxTotalRedemptions !== undefined && redeemedCount >= usageLimit.maxTotalRedemptions) {
    return err(new CouponUsageLimitError(code));
  }

  const userCount = countByUser(redemptions, userId);

  if (usageLimit.maxRedemptionsPerUser !== undefined) {
    if (usageLimit.maxRedemptionsPerUser === 1 && userCount >= 1) {
      return err(new CouponAlreadyRedeemedError(code, userId));
    }
    if (userCount >= usageLimit.maxRedemptionsPerUser) {
      return err(new CouponUsageLimitError(code));
    }
  }

  if (usageLimit.maxRedemptionsPerDay !== undefined) {
    const todayCount = countToday(redemptions, nowIso);
    if (todayCount >= usageLimit.maxRedemptionsPerDay) {
      return err(new CouponUsageLimitError(code));
    }
  }

  return ok(undefined);
}
