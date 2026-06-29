// Public surface of the @veritas/coupons package — re-exports all modules.
export {
  type CouponStatus,
  CouponStatusSchema,
  type CampaignStatus,
  CampaignStatusSchema,
  type ApplicableToPlan,
  ApplicableToPlanSchema,
  type UsageLimit,
  UsageLimitSchema,
  type Coupon,
  CouponSchema,
  type Campaign,
  CampaignSchema,
  type Redemption,
  RedemptionSchema,
} from "./types.js";
export * from "./code.js";
export * from "./discount.js";
export * from "./errors.js";
export * from "./limit.js";
export * from "./rule.js";
export * from "./validation.js";
export { type CouponStore, InMemoryCouponStore } from "./store.js";
