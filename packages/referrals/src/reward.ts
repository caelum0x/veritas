// reward.ts: reward rules for referrers and referees based on program config.
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import { type RewardConfig, type ReferralProgram } from "./program.js";
import { type Referral } from "./referral.js";

export const RewardTargetSchema = z.enum(["referrer", "referee"]);
export type RewardTarget = z.infer<typeof RewardTargetSchema>;

export const RewardSchema = z.object({
  referralId: z.string(),
  programId: z.string(),
  userId: z.string(),
  target: RewardTargetSchema,
  type: z.enum(["credit", "discount", "trial_extension", "cash"]),
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3),
  trialDays: z.number().int().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  issuedAt: z.string().datetime(),
});

export type Reward = z.infer<typeof RewardSchema>;

export type RewardError =
  | { kind: "referral_not_attributed" }
  | { kind: "already_rewarded" }
  | { kind: "max_rewards_exceeded" }
  | { kind: "no_reward_configured" };

export function computeRewards(
  program: ReferralProgram,
  referral: Referral,
  referrerRewardCount: number,
): Result<readonly Reward[], RewardError> {
  if (referral.status !== "attributed") {
    return err({ kind: "referral_not_attributed" });
  }

  if (referral.rewardedAt !== null) {
    return err({ kind: "already_rewarded" });
  }

  if (
    program.maxRewardsPerReferrer !== null &&
    referrerRewardCount >= program.maxRewardsPerReferrer
  ) {
    return err({ kind: "max_rewards_exceeded" });
  }

  const config = program.rewardConfig;
  const now = new Date().toISOString();
  const rewards: Reward[] = [];

  if (config.referrerAmount > 0) {
    rewards.push(buildReward(referral, config, "referrer", referral.referrerId, now));
  }

  if (config.refereeAmount > 0 && referral.refereeId !== null) {
    rewards.push(buildReward(referral, config, "referee", referral.refereeId, now));
  }

  if (rewards.length === 0) {
    return err({ kind: "no_reward_configured" });
  }

  return ok(rewards);
}

function buildReward(
  referral: Referral,
  config: RewardConfig,
  target: RewardTarget,
  userId: string,
  issuedAt: string,
): Reward {
  const amount = target === "referrer" ? config.referrerAmount : config.refereeAmount;
  return {
    referralId: referral.id,
    programId: referral.programId,
    userId,
    target,
    type: config.type,
    amount,
    currency: config.currency,
    trialDays: config.trialDays,
    discountPercent: config.discountPercent,
    issuedAt,
  };
}

export function summarizeReward(reward: Reward): string {
  switch (reward.type) {
    case "credit":
    case "cash":
      return `${reward.amount} ${reward.currency}`;
    case "discount":
      return `${reward.discountPercent ?? 0}% off`;
    case "trial_extension":
      return `${reward.trialDays ?? 0} days free trial`;
    default:
      return "reward";
  }
}
