// Maps @veritas/referrals domain objects to HTTP response shapes.
import type { Referral, ReferralProgram, Reward } from "@veritas/referrals";

export interface ReferralResponse {
  readonly id: string;
  readonly programId: string;
  readonly referrerId: string;
  readonly refereeId: string | null;
  readonly code: string;
  readonly status: string;
  readonly clickedAt: string;
  readonly attributedAt: string | null;
  readonly rewardedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProgramResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly rewardConfig: {
    readonly type: string;
    readonly referrerAmount: number;
    readonly refereeAmount: number;
    readonly currency: string;
    readonly trialDays?: number;
    readonly discountPercent?: number;
  };
  readonly maxRewardsPerReferrer: number | null;
  readonly attributionWindowDays: number;
  readonly requireVerifiedEmail: boolean;
  readonly allowSelfReferral: boolean;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RewardResponse {
  readonly referralId: string;
  readonly programId: string;
  readonly userId: string;
  readonly target: string;
  readonly type: string;
  readonly amount: number;
  readonly currency: string;
  readonly trialDays?: number;
  readonly discountPercent?: number;
  readonly issuedAt: string;
}

export function toReferralResponse(referral: Referral): ReferralResponse {
  return {
    id: referral.id,
    programId: referral.programId,
    referrerId: referral.referrerId,
    refereeId: referral.refereeId,
    code: referral.code,
    status: referral.status,
    clickedAt: referral.clickedAt,
    attributedAt: referral.attributedAt,
    rewardedAt: referral.rewardedAt,
    createdAt: referral.createdAt,
    updatedAt: referral.updatedAt,
  };
}

export function toProgramResponse(program: ReferralProgram): ProgramResponse {
  return {
    id: program.id,
    name: program.name,
    slug: program.slug,
    status: program.status,
    rewardConfig: {
      type: program.rewardConfig.type,
      referrerAmount: program.rewardConfig.referrerAmount,
      refereeAmount: program.rewardConfig.refereeAmount,
      currency: program.rewardConfig.currency,
      trialDays: program.rewardConfig.trialDays,
      discountPercent: program.rewardConfig.discountPercent,
    },
    maxRewardsPerReferrer: program.maxRewardsPerReferrer,
    attributionWindowDays: program.attributionWindowDays,
    requireVerifiedEmail: program.requireVerifiedEmail,
    allowSelfReferral: program.allowSelfReferral,
    startsAt: program.startsAt,
    endsAt: program.endsAt,
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

export function toRewardResponse(reward: Reward): RewardResponse {
  return {
    referralId: reward.referralId,
    programId: reward.programId,
    userId: reward.userId,
    target: reward.target,
    type: reward.type,
    amount: reward.amount,
    currency: reward.currency,
    trialDays: reward.trialDays,
    discountPercent: reward.discountPercent,
    issuedAt: reward.issuedAt,
  };
}
