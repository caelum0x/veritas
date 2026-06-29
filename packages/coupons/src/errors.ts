// Coupon-domain error types extending AppError.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class CouponNotFoundError extends AppError {
  constructor(id: string, opts: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Coupon not found: ${id}`, opts);
  }
}

export class CouponExpiredError extends AppError {
  constructor(code: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Coupon has expired: ${code}`, opts);
  }
}

export class CouponInactiveError extends AppError {
  constructor(code: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Coupon is not active: ${code}`, opts);
  }
}

export class CouponUsageLimitError extends AppError {
  constructor(code: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Coupon usage limit reached: ${code}`, opts);
  }
}

export class CouponAlreadyRedeemedError extends AppError {
  constructor(code: string, userId: string, opts: AppErrorOptions = {}) {
    super("CONFLICT", 422, `Coupon ${code} already redeemed by user ${userId}`, opts);
  }
}

export class CouponMinOrderError extends AppError {
  constructor(required: number, actual: number, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Order total ${actual} is below minimum ${required}`, opts);
  }
}

export class CouponNotApplicableError extends AppError {
  constructor(reason: string, opts: AppErrorOptions = {}) {
    super("VALIDATION", 422, `Coupon not applicable: ${reason}`, opts);
  }
}

export class CampaignNotFoundError extends AppError {
  constructor(id: string, opts: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Campaign not found: ${id}`, opts);
  }
}

export class DuplicateCouponCodeError extends AppError {
  constructor(code: string, opts: AppErrorOptions = {}) {
    super("CONFLICT", 409, `Coupon code already exists: ${code}`, opts);
  }
}
