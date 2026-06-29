// Bridges @veritas/coupons InMemoryCouponStore to the CouponServicePort expected by the coupons feature.
import type {
  CouponServicePort,
  CouponView,
  CampaignView,
  RedemptionRecord,
} from "./controllers/coupons.controller.js";
import type { CouponStore } from "@veritas/coupons";

/** Legacy self-contained in-memory adapter — kept for backward compat. */
export class InMemoryCouponServiceAdapter implements CouponServicePort {
  private readonly coupons = new Map<string, CouponView>();
  private readonly codeIndex = new Map<string, string>();
  private readonly campaigns = new Map<string, CampaignView>();
  private readonly redemptions: RedemptionRecord[] = [];
  private readonly redemptionCounts = new Map<string, number>();

  async findByCode(code: string): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }> {
    const id = this.codeIndex.get(code.toUpperCase());
    if (id === undefined) return { ok: false, error: new Error(`Coupon with code '${code}' not found`) };
    const coupon = this.coupons.get(id);
    if (coupon === undefined) return { ok: false, error: new Error(`Coupon with code '${code}' not found`) };
    return { ok: true, value: coupon };
  }

  async findById(id: string): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }> {
    const coupon = this.coupons.get(id);
    if (coupon === undefined) return { ok: false, error: new Error(`Coupon '${id}' not found`) };
    return { ok: true, value: coupon };
  }

  async listAll(campaignId?: string): Promise<readonly CouponView[]> {
    const all = Array.from(this.coupons.values());
    return campaignId === undefined ? all : all.filter((c) => c.campaignId === campaignId);
  }

  async save(
    coupon: Omit<CouponView, "totalRedemptions" | "createdAt" | "updatedAt"> & { totalRedemptions?: number },
  ): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }> {
    const upper = coupon.code.toUpperCase();
    const existingId = this.codeIndex.get(upper);
    if (existingId !== undefined && existingId !== coupon.id) {
      return { ok: false, error: new Error(`Coupon code '${coupon.code}' already exists`) };
    }
    const nowIso = new Date().toISOString();
    const view: CouponView = { ...coupon, totalRedemptions: coupon.totalRedemptions ?? 0, createdAt: nowIso, updatedAt: nowIso };
    this.coupons.set(view.id, view);
    this.codeIndex.set(upper, view.id);
    return { ok: true, value: view };
  }

  async update(
    id: string,
    patch: Partial<Pick<CouponView, "status" | "description">>,
  ): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }> {
    const existing = this.coupons.get(id);
    if (existing === undefined) return { ok: false, error: new Error(`Coupon '${id}' not found`) };
    const updated: CouponView = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.coupons.set(id, updated);
    return { ok: true, value: updated };
  }

  async incrementRedemptions(id: string): Promise<void> {
    const existing = this.coupons.get(id);
    if (existing !== undefined) {
      this.coupons.set(id, { ...existing, totalRedemptions: existing.totalRedemptions + 1, updatedAt: new Date().toISOString() });
    }
  }

  async saveRedemption(record: RedemptionRecord): Promise<void> {
    this.redemptions.push(record);
    this.redemptionCounts.set(record.couponId, (this.redemptionCounts.get(record.couponId) ?? 0) + 1);
  }

  async listRedemptions(couponId: string): Promise<readonly RedemptionRecord[]> {
    return this.redemptions.filter((r) => r.couponId === couponId);
  }

  async countRedemptions(couponId: string): Promise<number> {
    return this.redemptionCounts.get(couponId) ?? 0;
  }

  async countUserRedemptions(couponId: string, userId: string): Promise<number> {
    return this.redemptions.filter((r) => r.couponId === couponId && r.userId === userId).length;
  }

  async findCampaign(id: string): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }> {
    const campaign = this.campaigns.get(id);
    if (campaign === undefined) return { ok: false, error: new Error(`Campaign '${id}' not found`) };
    return { ok: true, value: campaign };
  }

  async listCampaigns(): Promise<readonly CampaignView[]> {
    return Array.from(this.campaigns.values());
  }

  async saveCampaign(
    campaign: Omit<CampaignView, "createdAt" | "updatedAt">,
  ): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }> {
    const nowIso = new Date().toISOString();
    const view: CampaignView = { ...campaign, createdAt: nowIso, updatedAt: nowIso };
    this.campaigns.set(view.id, view);
    return { ok: true, value: view };
  }

  async updateCampaign(
    id: string,
    patch: Partial<Pick<CampaignView, "name" | "description" | "status" | "startsAt" | "endsAt">>,
  ): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }> {
    const existing = this.campaigns.get(id);
    if (existing === undefined) return { ok: false, error: new Error(`Campaign '${id}' not found`) };
    const updated: CampaignView = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.campaigns.set(id, updated);
    return { ok: true, value: updated };
  }

  async addCouponToCampaign(
    campaignId: string,
    couponId: string,
  ): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }> {
    const existing = this.campaigns.get(campaignId);
    if (existing === undefined) return { ok: false, error: new Error(`Campaign '${campaignId}' not found`) };
    if (existing.couponIds.includes(couponId)) return { ok: true, value: existing };
    const updated: CampaignView = { ...existing, couponIds: [...existing.couponIds, couponId], updatedAt: new Date().toISOString() };
    this.campaigns.set(campaignId, updated);
    return { ok: true, value: updated };
  }
}

/**
 * Factory that returns a CouponServicePort backed by an in-memory adapter.
 * The `_store` parameter is accepted but currently the adapter owns its own storage;
 * wiring a persistent store is left for the production store layer.
 */
export function makeCouponServicePort(_store: CouponStore): CouponServicePort {
  return new InMemoryCouponServiceAdapter();
}
