// redemption.ts: redeem approved referral rewards for eligible recipients.
import { Result, ok, err, newId } from "@veritas/core";
import { Reward } from "./reward.js";
import { RewardAlreadyRedeemedError, RewardNotEligibleError } from "./errors.js";

export interface Redemption {
  readonly id: string;
  readonly rewardId: string;
  readonly referralId: string;
  readonly recipientId: string;
  readonly redeemedAt: string;
  readonly notes?: string;
  readonly createdAt: string;
}

export interface RedeemInput {
  readonly reward: Reward;
  readonly recipientId: string;
  readonly notes?: string;
}

export interface RedemptionStore {
  save(redemption: Redemption): Promise<Result<Redemption>>;
  findByRewardId(rewardId: string): Promise<Result<Redemption | null>>;
  findByRecipient(recipientId: string): Promise<Result<readonly Redemption[]>>;
  existsByReward(rewardId: string): Promise<Result<boolean>>;
}

export class InMemoryRedemptionStore implements RedemptionStore {
  private readonly records = new Map<string, Redemption>();
  // index rewardId -> redemption id for fast lookups
  private readonly byReward = new Map<string, string>();

  async save(redemption: Redemption): Promise<Result<Redemption>> {
    this.records.set(redemption.id, redemption);
    this.byReward.set(redemption.rewardId, redemption.id);
    return ok(redemption);
  }

  async findByRewardId(rewardId: string): Promise<Result<Redemption | null>> {
    const id = this.byReward.get(rewardId);
    if (!id) return ok(null);
    const redemption = this.records.get(id) ?? null;
    return ok(redemption);
  }

  async findByRecipient(recipientId: string): Promise<Result<readonly Redemption[]>> {
    const results = [...this.records.values()].filter((r) => r.recipientId === recipientId);
    return ok(results);
  }

  async existsByReward(rewardId: string): Promise<Result<boolean>> {
    return ok(this.byReward.has(rewardId));
  }
}

function buildRedemption(reward: Reward, recipientId: string, notes?: string): Redemption {
  const now = new Date().toISOString();
  return {
    id: newId("redemption"),
    rewardId: `${reward.referralId}-${reward.target}`,
    referralId: reward.referralId,
    recipientId,
    redeemedAt: now,
    notes,
    createdAt: now,
  };
}

export class RedemptionService {
  constructor(private readonly store: RedemptionStore) {}

  async redeem(input: RedeemInput): Promise<Result<Redemption>> {
    const rewardId = `${input.reward.referralId}-${input.reward.target}`;

    const existsResult = await this.store.existsByReward(rewardId);
    if (!existsResult.ok) return err(existsResult.error);
    if (existsResult.value) {
      return err(new RewardAlreadyRedeemedError(rewardId));
    }

    const redemption = buildRedemption(input.reward, input.recipientId, input.notes);
    return this.store.save(redemption);
  }

  async hasBeenRedeemed(reward: Reward): Promise<Result<boolean>> {
    const rewardId = `${reward.referralId}-${reward.target}`;
    return this.store.existsByReward(rewardId);
  }

  async getHistoryForRecipient(recipientId: string): Promise<Result<readonly Redemption[]>> {
    return this.store.findByRecipient(recipientId);
  }
}
