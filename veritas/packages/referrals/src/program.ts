// program.ts: referral program configuration types and defaults.
import { z } from "zod";
import { newId } from "@veritas/core";

export const RewardTypeSchema = z.enum(["credit", "discount", "trial_extension", "cash"]);
export type RewardType = z.infer<typeof RewardTypeSchema>;

export const RewardConfigSchema = z.object({
  type: RewardTypeSchema,
  referrerAmount: z.number().int().nonnegative(),
  refereeAmount: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
  trialDays: z.number().int().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export type RewardConfig = z.infer<typeof RewardConfigSchema>;

export const ProgramStatusSchema = z.enum(["active", "paused", "archived"]);
export type ProgramStatus = z.infer<typeof ProgramStatusSchema>;

export const ReferralProgramSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: ProgramStatusSchema,
  rewardConfig: RewardConfigSchema,
  maxRewardsPerReferrer: z.number().int().positive().nullable(),
  attributionWindowDays: z.number().int().positive().default(30),
  requireVerifiedEmail: z.boolean().default(true),
  allowSelfReferral: z.boolean().default(false),
  minAccountAgeDays: z.number().int().nonnegative().default(0),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ReferralProgram = z.infer<typeof ReferralProgramSchema>;

export const CreateProgramSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  rewardConfig: RewardConfigSchema,
  maxRewardsPerReferrer: z.number().int().positive().nullable().default(null),
  attributionWindowDays: z.number().int().positive().default(30),
  requireVerifiedEmail: z.boolean().default(true),
  allowSelfReferral: z.boolean().default(false),
  minAccountAgeDays: z.number().int().nonnegative().default(0),
  startsAt: z.string().datetime().nullable().default(null),
  endsAt: z.string().datetime().nullable().default(null),
});

export type CreateProgram = z.infer<typeof CreateProgramSchema>;

export function makeProgram(input: CreateProgram): ReferralProgram {
  const now = new Date().toISOString();
  return {
    id: newId("program"),
    name: input.name,
    slug: input.slug,
    status: "active",
    rewardConfig: input.rewardConfig,
    maxRewardsPerReferrer: input.maxRewardsPerReferrer,
    attributionWindowDays: input.attributionWindowDays,
    requireVerifiedEmail: input.requireVerifiedEmail,
    allowSelfReferral: input.allowSelfReferral,
    minAccountAgeDays: input.minAccountAgeDays,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    createdAt: now,
    updatedAt: now,
  };
}

export function isProgramActive(program: ReferralProgram, now = new Date()): boolean {
  if (program.status !== "active") return false;
  const nowIso = now.toISOString();
  if (program.startsAt && nowIso < program.startsAt) return false;
  if (program.endsAt && nowIso > program.endsAt) return false;
  return true;
}

export function pauseProgram(program: ReferralProgram): ReferralProgram {
  return { ...program, status: "paused", updatedAt: new Date().toISOString() };
}

export function archiveProgram(program: ReferralProgram): ReferralProgram {
  return { ...program, status: "archived", updatedAt: new Date().toISOString() };
}
