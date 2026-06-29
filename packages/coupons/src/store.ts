// In-memory coupon store: port interface + mock implementation for coupons, campaigns, redemptions.
import { type Result, ok, err } from "@veritas/core";
import { type Coupon, type Campaign, type Redemption } from "./types.js";
import { CouponNotFoundError, CampaignNotFoundError, DuplicateCouponCodeError } from "./errors.js";

export interface CouponStore {
  getCoupon(id: string): Promise<Result<Coupon, CouponNotFoundError>>;
  getCouponByCode(code: string): Promise<Result<Coupon, CouponNotFoundError>>;
  listCoupons(campaignId?: string): Promise<ReadonlyArray<Coupon>>;
  saveCoupon(coupon: Coupon): Promise<Result<Coupon, DuplicateCouponCodeError>>;
  updateCoupon(coupon: Coupon): Promise<Result<Coupon, CouponNotFoundError>>;

  getCampaign(id: string): Promise<Result<Campaign, CampaignNotFoundError>>;
  listCampaigns(): Promise<ReadonlyArray<Campaign>>;
  saveCampaign(campaign: Campaign): Promise<Campaign>;
  updateCampaign(campaign: Campaign): Promise<Result<Campaign, CampaignNotFoundError>>;

  getRedemptions(couponId: string): Promise<ReadonlyArray<Redemption>>;
  getRedemptionsByUser(userId: string): Promise<ReadonlyArray<Redemption>>;
  saveRedemption(redemption: Redemption): Promise<Redemption>;
}

export class InMemoryCouponStore implements CouponStore {
  private readonly coupons = new Map<string, Coupon>();
  private readonly codeIndex = new Map<string, string>();
  private readonly campaigns = new Map<string, Campaign>();
  private readonly redemptions: Redemption[] = [];

  async getCoupon(id: string): Promise<Result<Coupon, CouponNotFoundError>> {
    const c = this.coupons.get(id);
    return c !== undefined ? ok(c) : err(new CouponNotFoundError(id));
  }

  async getCouponByCode(code: string): Promise<Result<Coupon, CouponNotFoundError>> {
    const id = this.codeIndex.get(code.toUpperCase());
    if (id === undefined) return err(new CouponNotFoundError(code));
    const c = this.coupons.get(id);
    return c !== undefined ? ok(c) : err(new CouponNotFoundError(code));
  }

  async listCoupons(campaignId?: string): Promise<ReadonlyArray<Coupon>> {
    const all = Array.from(this.coupons.values());
    if (campaignId === undefined) return all;
    return all.filter((c) => c.campaignId === campaignId);
  }

  async saveCoupon(coupon: Coupon): Promise<Result<Coupon, DuplicateCouponCodeError>> {
    const upper = coupon.code.toUpperCase();
    const existing = this.codeIndex.get(upper);
    if (existing !== undefined && existing !== coupon.id) {
      return err(new DuplicateCouponCodeError(coupon.code));
    }
    this.coupons.set(coupon.id, coupon);
    this.codeIndex.set(upper, coupon.id);
    return ok(coupon);
  }

  async updateCoupon(coupon: Coupon): Promise<Result<Coupon, CouponNotFoundError>> {
    if (!this.coupons.has(coupon.id)) return err(new CouponNotFoundError(coupon.id));
    const old = this.coupons.get(coupon.id)!;
    if (old.code.toUpperCase() !== coupon.code.toUpperCase()) {
      this.codeIndex.delete(old.code.toUpperCase());
      this.codeIndex.set(coupon.code.toUpperCase(), coupon.id);
    }
    this.coupons.set(coupon.id, coupon);
    return ok(coupon);
  }

  async getCampaign(id: string): Promise<Result<Campaign, CampaignNotFoundError>> {
    const c = this.campaigns.get(id);
    return c !== undefined ? ok(c) : err(new CampaignNotFoundError(id));
  }

  async listCampaigns(): Promise<ReadonlyArray<Campaign>> {
    return Array.from(this.campaigns.values());
  }

  async saveCampaign(campaign: Campaign): Promise<Campaign> {
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async updateCampaign(campaign: Campaign): Promise<Result<Campaign, CampaignNotFoundError>> {
    if (!this.campaigns.has(campaign.id)) return err(new CampaignNotFoundError(campaign.id));
    this.campaigns.set(campaign.id, campaign);
    return ok(campaign);
  }

  async getRedemptions(couponId: string): Promise<ReadonlyArray<Redemption>> {
    return this.redemptions.filter((r) => r.couponId === couponId);
  }

  async getRedemptionsByUser(userId: string): Promise<ReadonlyArray<Redemption>> {
    return this.redemptions.filter((r) => r.userId === userId);
  }

  async saveRedemption(redemption: Redemption): Promise<Redemption> {
    this.redemptions.push(redemption);
    return redemption;
  }
}
