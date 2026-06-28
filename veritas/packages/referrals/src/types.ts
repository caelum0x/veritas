// Shared branded ID types and auxiliary schemas for the referrals module.
import { z } from "zod";
import { type Id } from "@veritas/core";

export type ReferralId = Id<"referral">;
export type ReferralCodeId = Id<"refcode">;
export type ProgramId = Id<"program">;
export type RewardId = Id<"reward">;
export type TrackingEventId = Id<"tracking">;

export const FraudCheckResultSchema = z.enum(["pass", "suspect", "blocked"]);
export type FraudCheckResult = z.infer<typeof FraudCheckResultSchema>;

export const AttributionModelSchema = z.enum(["first_touch", "last_touch", "linear"]);
export type AttributionModel = z.infer<typeof AttributionModelSchema>;

export const RedemptionSchema = z.object({
  id: z.string(),
  rewardId: z.string(),
  referralId: z.string(),
  recipientId: z.string(),
  redeemedAt: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
});
export type Redemption = z.infer<typeof RedemptionSchema>;
