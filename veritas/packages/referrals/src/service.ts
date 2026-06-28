// service.ts: referral service orchestrating program, code, attribution, reward, and fraud checks.
import { Result, ok, err, newId } from "@veritas/core";
import { Referral, makeReferral, markReferralRewarded, markReferralFraud } from "./referral.js";
import { ReferralProgram, makeProgram, CreateProgram, isProgramActive } from "./program.js";
import { generateUserCode, isValidCode, normalizeCode } from "./code.js";
import {
  checkAttributionEligibility,
  performAttribution,
  AttributionRequest,
  FraudSignals,
} from "./attribution.js";
import { computeRewards, Reward } from "./reward.js";
import { ReferralStore } from "./store.js";
import { Tracker } from "./tracking.js";
import { RedemptionService, Redemption } from "./redemption.js";
import {
  ReferralCodeNotFoundError,
  ReferralNotFoundError,
  ReferralProgramNotFoundError,
  ReferralProgramInactiveError,
  FraudSuspectedError,
} from "./errors.js";

export interface RegisterClickInput {
  readonly code: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AttributeSignupInput {
  readonly referralId: string;
  readonly request: AttributionRequest;
  readonly fraudSignals: FraudSignals;
}

export interface IssueRewardsInput {
  readonly referralId: string;
}

export interface RedeemRewardInput {
  readonly reward: Reward;
  readonly recipientId: string;
  readonly notes?: string;
}

export interface CreateProgramInput extends CreateProgram {}

export class ReferralService {
  constructor(
    private readonly store: ReferralStore,
    private readonly tracker: Tracker,
    private readonly redemptionService: RedemptionService,
  ) {}

  async createProgram(input: CreateProgramInput): Promise<Result<ReferralProgram>> {
    const program = makeProgram(input);
    return this.store.saveProgram(program);
  }

  async getProgram(id: string): Promise<Result<ReferralProgram>> {
    return this.store.getProgram(id);
  }

  async listPrograms(): Promise<Result<readonly ReferralProgram[]>> {
    return this.store.listPrograms();
  }

  /** Generate and store a referral code for a user, then record a click when shared. */
  async registerClick(programId: string, referrerId: string, input: RegisterClickInput): Promise<Result<Referral>> {
    const programResult = await this.store.getProgram(programId);
    if (!programResult.ok) return err(programResult.error);
    const program = programResult.value;

    if (!isProgramActive(program)) {
      return err(new ReferralProgramInactiveError(programId));
    }

    const code = normalizeCode(input.code);
    if (!isValidCode(code)) {
      return err(new ReferralCodeNotFoundError(code));
    }

    const referral = makeReferral({
      programId,
      referrerId,
      code,
      clickedAt: new Date().toISOString(),
      metadata: input.metadata,
    });

    const saved = await this.store.saveReferral(referral);
    if (!saved.ok) return err(saved.error);

    await this.tracker.record({
      referralId: referral.id,
      code,
      eventType: "click",
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: input.metadata,
    });

    return ok(saved.value);
  }

  /** Attribute a signup to an existing pending referral. */
  async attributeSignup(input: AttributeSignupInput): Promise<Result<Referral>> {
    const referralResult = await this.store.getReferral(input.referralId);
    if (!referralResult.ok) return err(referralResult.error);
    const referral = referralResult.value;

    const programResult = await this.store.getProgram(referral.programId);
    if (!programResult.ok) return err(programResult.error);
    const program = programResult.value;

    const eligibility = checkAttributionEligibility(program, referral, input.request, input.fraudSignals);
    if (!eligibility.ok) {
      if (eligibility.error.kind === "fraud_detected") {
        const frauded = markReferralFraud(referral);
        await this.store.updateReferral(frauded);
        return err(new FraudSuspectedError(eligibility.error.reason));
      }
      return err(new ReferralProgramInactiveError(referral.programId));
    }

    const attributed = performAttribution(referral, input.request.refereeId);

    const updated = await this.store.updateReferral(attributed);
    if (!updated.ok) return err(updated.error);

    await this.tracker.record({
      referralId: referral.id,
      code: referral.code,
      eventType: "conversion",
      actorId: input.request.refereeId,
      metadata: { refereeEmail: input.request.refereeEmail },
    });

    return ok(updated.value);
  }

  /** Compute and return rewards for a fully-attributed referral. */
  async issueRewards(input: IssueRewardsInput): Promise<Result<readonly Reward[]>> {
    const referralResult = await this.store.getReferral(input.referralId);
    if (!referralResult.ok) return err(referralResult.error);
    const referral = referralResult.value;

    const programResult = await this.store.getProgram(referral.programId);
    if (!programResult.ok) return err(programResult.error);
    const program = programResult.value;

    const referrerRewardsResult = await this.store.findReferralsByReferrer(referral.referrerId, referral.programId);
    if (!referrerRewardsResult.ok) return err(referrerRewardsResult.error);
    const rewardedCount = referrerRewardsResult.value.filter((r) => r.status === "rewarded").length;

    const rewardsResult = computeRewards(program, referral, rewardedCount);
    if (!rewardsResult.ok) {
      return err(new FraudSuspectedError(`Reward computation failed: ${rewardsResult.error.kind}`));
    }

    const rewarded = markReferralRewarded(referral);
    const updateResult = await this.store.updateReferral(rewarded);
    if (!updateResult.ok) return err(updateResult.error);

    await this.tracker.record({
      referralId: referral.id,
      code: referral.code,
      eventType: "reward_issued",
      actorId: referral.referrerId,
    });

    return ok(rewardsResult.value);
  }

  /** Redeem a reward for a recipient. */
  async redeemReward(input: RedeemRewardInput): Promise<Result<Redemption>> {
    return this.redemptionService.redeem({
      reward: input.reward,
      recipientId: input.recipientId,
      notes: input.notes,
    });
  }

  /** Look up all referrals made by a referrer across the given program. */
  async getReferralsByReferrer(referrerId: string, programId?: string): Promise<Result<readonly Referral[]>> {
    return this.store.findReferralsByReferrer(referrerId, programId);
  }

  /** Generate a unique referral code for a user. */
  generateCodeForUser(userId: string): string {
    return generateUserCode(userId);
  }
}
