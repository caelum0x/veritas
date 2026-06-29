// Coupon feature service: orchestrates coupon and campaign lifecycle via the CouponServicePort.
import { newId } from "@veritas/core";
import { evaluateRules, type RuleContext } from "@veritas/coupons";
import type { CouponServicePort, CouponView, CampaignView, RedemptionRecord } from "../../controllers/coupons.controller.js";
import type {
  CreateCouponBody,
  RedeemCouponBody,
  CreateCampaignBody,
  UpdateCampaignBody,
} from "./coupons.schema.js";

function applyDiscount(price: bigint, discount: CouponView["discount"]): bigint {
  if (discount.kind === "percent") {
    const off = (price * BigInt(discount.basisPoints)) / 10000n;
    return price - off < 0n ? 0n : price - off;
  }
  if (discount.kind === "fixed_usdc") {
    const after = price - discount.amountBaseUnits;
    return after < 0n ? 0n : after;
  }
  // trial_days: no monetary value
  return price;
}

export type CouponServiceError =
  | { kind: "not_found"; message: string }
  | { kind: "inactive"; message: string }
  | { kind: "rule_violation"; violations: string[] }
  | { kind: "conflict"; message: string }
  | { kind: "unknown"; cause: unknown };

export type CouponResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CouponServiceError };

export class CouponsService {
  constructor(private readonly port: CouponServicePort) {}

  async getByCode(code: string): Promise<CouponResult<CouponView>> {
    const result = await this.port.findByCode(code.toUpperCase());
    if (!result.ok) return { ok: false, error: { kind: "not_found", message: `Coupon '${code}' not found` } };
    return { ok: true, value: result.value };
  }

  async getById(id: string): Promise<CouponResult<CouponView>> {
    const result = await this.port.findById(id);
    if (!result.ok) return { ok: false, error: { kind: "not_found", message: `Coupon '${id}' not found` } };
    return { ok: true, value: result.value };
  }

  async list(campaignId?: string): Promise<readonly CouponView[]> {
    return this.port.listAll(campaignId);
  }

  async create(body: CreateCouponBody): Promise<CouponResult<CouponView>> {
    const data = {
      id: newId("cpn"),
      code: body.code,
      description: body.description,
      discount: body.discount,
      rule: body.rule,
      status: "active" as const,
      campaignId: body.campaignId,
    };
    const result = await this.port.save(data);
    if (!result.ok) return { ok: false, error: { kind: "conflict", message: String(result.error) } };
    return { ok: true, value: result.value };
  }

  async redeem(body: RedeemCouponBody): Promise<CouponResult<RedemptionRecord>> {
    const couponResult = await this.port.findByCode(body.code.toUpperCase());
    if (!couponResult.ok) {
      return { ok: false, error: { kind: "not_found", message: `Coupon '${body.code}' not found` } };
    }
    const coupon = couponResult.value;

    if (coupon.status !== "active") {
      return {
        ok: false,
        error: { kind: "inactive", message: `Coupon '${body.code}' is not active (status: ${coupon.status})` },
      };
    }

    const [totalCount, userCount] = await Promise.all([
      this.port.countRedemptions(coupon.id),
      this.port.countUserRedemptions(coupon.id, body.userId),
    ]);

    const nowIso = new Date().toISOString();
    const ctx: RuleContext = {
      nowIso,
      userId: body.userId,
      orgId: body.orgId,
      planId: body.planId,
      tier: body.tier,
      isFirstOrder: body.isFirstOrder,
      orderBaseUnits: body.orderBaseUnits,
      totalRedemptionCount: totalCount,
      userRedemptionCount: userCount,
    };

    const violations = evaluateRules(coupon.rule, ctx);
    if (violations.length > 0) {
      return { ok: false, error: { kind: "rule_violation", violations } };
    }

    const original = body.orderBaseUnits;
    const discounted = applyDiscount(original, coupon.discount);
    const saved = original - discounted;

    const record: RedemptionRecord = {
      id: newId("rdm"),
      couponId: coupon.id,
      couponCode: coupon.code,
      userId: body.userId,
      orgId: body.orgId,
      orderId: body.orderId,
      originalBaseUnits: original.toString(),
      discountedBaseUnits: discounted.toString(),
      savedBaseUnits: saved.toString(),
      redeemedAt: nowIso,
      metadata: body.metadata,
    };

    await Promise.all([
      this.port.saveRedemption(record),
      this.port.incrementRedemptions(coupon.id),
    ]);

    return { ok: true, value: record };
  }

  async deactivate(id: string): Promise<CouponResult<CouponView>> {
    const result = await this.port.update(id, { status: "paused" as const });
    if (!result.ok) return { ok: false, error: { kind: "not_found", message: `Coupon '${id}' not found` } };
    return { ok: true, value: result.value };
  }

  async listRedemptions(couponId: string): Promise<readonly RedemptionRecord[]> {
    return this.port.listRedemptions(couponId);
  }

  async getCampaign(id: string): Promise<CouponResult<CampaignView>> {
    const result = await this.port.findCampaign(id);
    if (!result.ok) return { ok: false, error: { kind: "not_found", message: `Campaign '${id}' not found` } };
    return { ok: true, value: result.value };
  }

  async listCampaigns(): Promise<readonly CampaignView[]> {
    return this.port.listCampaigns();
  }

  async createCampaign(body: CreateCampaignBody): Promise<CouponResult<CampaignView>> {
    const campaign: Omit<CampaignView, "createdAt" | "updatedAt"> = {
      id: newId("cam"),
      name: body.name,
      description: body.description,
      status: body.status,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      couponIds: body.couponIds,
    };
    const result = await this.port.saveCampaign(campaign);
    if (!result.ok) return { ok: false, error: { kind: "conflict", message: String(result.error) } };
    return { ok: true, value: result.value };
  }

  async updateCampaign(id: string, body: UpdateCampaignBody): Promise<CouponResult<CampaignView>> {
    const result = await this.port.updateCampaign(id, body);
    if (!result.ok) return { ok: false, error: { kind: "not_found", message: `Campaign '${id}' not found` } };
    return { ok: true, value: result.value };
  }

  async addCouponToCampaign(campaignId: string, couponId: string): Promise<CouponResult<CampaignView>> {
    const result = await this.port.addCouponToCampaign(campaignId, couponId);
    if (!result.ok) return { ok: false, error: { kind: "not_found", message: `Campaign '${campaignId}' not found` } };
    return { ok: true, value: result.value };
  }
}
