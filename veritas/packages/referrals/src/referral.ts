// referral.ts: referral record type and schema definitions.
import { z } from "zod";
import { newId } from "@veritas/core";

export const ReferralStatusSchema = z.enum(["pending", "attributed", "rewarded", "expired", "fraud"]);
export type ReferralStatus = z.infer<typeof ReferralStatusSchema>;

export const ReferralSchema = z.object({
  id: z.string(),
  programId: z.string(),
  referrerId: z.string(),
  refereeId: z.string().nullable(),
  code: z.string(),
  clickedAt: z.string().datetime(),
  attributedAt: z.string().datetime().nullable(),
  rewardedAt: z.string().datetime().nullable(),
  status: ReferralStatusSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Referral = z.infer<typeof ReferralSchema>;

export const CreateReferralSchema = z.object({
  programId: z.string().min(1),
  referrerId: z.string().min(1),
  code: z.string().min(1),
  clickedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateReferral = z.infer<typeof CreateReferralSchema>;

export function makeReferral(input: CreateReferral): Referral {
  const now = new Date().toISOString();
  return {
    id: newId("referral"),
    programId: input.programId,
    referrerId: input.referrerId,
    refereeId: null,
    code: input.code,
    clickedAt: input.clickedAt,
    attributedAt: null,
    rewardedAt: null,
    status: "pending",
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function attributeReferral(referral: Referral, refereeId: string): Referral {
  return {
    ...referral,
    refereeId,
    attributedAt: new Date().toISOString(),
    status: "attributed",
    updatedAt: new Date().toISOString(),
  };
}

export function markReferralRewarded(referral: Referral): Referral {
  return {
    ...referral,
    rewardedAt: new Date().toISOString(),
    status: "rewarded",
    updatedAt: new Date().toISOString(),
  };
}

export function markReferralFraud(referral: Referral): Referral {
  return {
    ...referral,
    status: "fraud",
    updatedAt: new Date().toISOString(),
  };
}
