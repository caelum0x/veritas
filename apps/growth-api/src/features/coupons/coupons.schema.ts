// Zod schemas for coupon and campaign HTTP request/response validation.
import { z } from "zod";
import { DiscountSchema, RedemptionRuleSchema } from "@veritas/coupons";

export const CreateCouponBodySchema = z.object({
  code: z.string().min(1).max(64).toUpperCase(),
  description: z.string().max(256).optional(),
  discount: DiscountSchema,
  rule: RedemptionRuleSchema,
  campaignId: z.string().optional(),
});
export type CreateCouponBody = z.infer<typeof CreateCouponBodySchema>;

export const RedeemCouponBodySchema = z.object({
  code: z.string().min(1),
  userId: z.string().min(1),
  orgId: z.string().optional(),
  planId: z.string().optional(),
  tier: z.string().optional(),
  isFirstOrder: z.boolean().default(false),
  orderBaseUnits: z
    .string()
    .regex(/^\d+$/, "must be a non-negative integer string")
    .transform((v) => BigInt(v)),
  orderId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});
export type RedeemCouponBody = z.infer<typeof RedeemCouponBodySchema>;

export const CreateCampaignBodySchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(512).optional(),
  status: z.enum(["draft", "active", "paused", "ended"]).default("draft"),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  couponIds: z.array(z.string()).default([]),
});
export type CreateCampaignBody = z.infer<typeof CreateCampaignBodySchema>;

export const UpdateCampaignBodySchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(512).optional(),
  status: z.enum(["draft", "active", "paused", "ended"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
export type UpdateCampaignBody = z.infer<typeof UpdateCampaignBodySchema>;

export const CouponCodeParamSchema = z.object({ code: z.string().min(1) });
export const CouponIdParamSchema = z.object({ id: z.string().min(1) });
export const CampaignIdParamSchema = z.object({ id: z.string().min(1) });
export const AddCouponToCampaignParamSchema = z.object({
  id: z.string().min(1),
  couponId: z.string().min(1),
});
export const ListCouponsQuerySchema = z.object({
  campaignId: z.string().optional(),
});
