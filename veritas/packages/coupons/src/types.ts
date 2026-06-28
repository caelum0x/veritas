// Core domain types for the coupons module.
import { z } from "zod";

export const DiscountKindSchema = z.enum(["percent", "fixed", "free_trial_days"]);
export type DiscountKind = z.infer<typeof DiscountKindSchema>;

export const CouponStatusSchema = z.enum(["active", "inactive", "exhausted", "expired"]);
export type CouponStatus = z.infer<typeof CouponStatusSchema>;

export const CampaignStatusSchema = z.enum(["draft", "active", "paused", "ended"]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const ApplicableToPlanSchema = z.object({
  planIds: z.array(z.string()).optional(),
  allPlans: z.boolean().optional(),
});
export type ApplicableToPlan = z.infer<typeof ApplicableToPlanSchema>;

export const UsageLimitSchema = z.object({
  maxTotalRedemptions: z.number().int().positive().optional(),
  maxRedemptionsPerUser: z.number().int().positive().optional(),
  maxRedemptionsPerDay: z.number().int().positive().optional(),
});
export type UsageLimit = z.infer<typeof UsageLimitSchema>;

export const DiscountSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("percent"), basisPoints: z.number().int().min(1).max(10000) }),
  z.object({ kind: z.literal("fixed"), amountUsdcBase: z.number().int().positive() }),
  z.object({ kind: z.literal("free_trial_days"), days: z.number().int().positive() }),
]);
export type Discount = z.infer<typeof DiscountSchema>;

export const CouponSchema = z.object({
  id: z.string(),
  campaignId: z.string().optional(),
  code: z.string().min(1).max(64),
  description: z.string().optional(),
  discount: DiscountSchema,
  status: CouponStatusSchema,
  usageLimit: UsageLimitSchema,
  applicableTo: ApplicableToPlanSchema,
  minOrderAmountUsdcBase: z.number().int().nonnegative().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  redeemedCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  status: CampaignStatusSchema,
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  couponIds: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const RedemptionSchema = z.object({
  id: z.string(),
  couponId: z.string(),
  couponCode: z.string(),
  userId: z.string(),
  orderId: z.string().optional(),
  discount: DiscountSchema,
  appliedAmountUsdcBase: z.number().int().nonnegative().optional(),
  redeemedAt: z.string().datetime(),
});
export type Redemption = z.infer<typeof RedemptionSchema>;
