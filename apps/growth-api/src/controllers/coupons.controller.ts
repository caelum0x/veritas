// Coupons HTTP controller: coupon lookup, creation, campaign queries, and redemption.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr, newId } from "@veritas/core";
import {
  DiscountSchema,
  RedemptionRuleSchema,
  evaluateRules,
  type RuleContext,
} from "@veritas/coupons";

/** Coupon view shape used within the growth-api layer. */
export interface CouponView {
  readonly id: string;
  readonly code: string;
  readonly description?: string;
  readonly discount: z.infer<typeof DiscountSchema>;
  readonly rule: z.infer<typeof RedemptionRuleSchema>;
  readonly status: "active" | "paused" | "expired" | "exhausted";
  readonly campaignId?: string;
  readonly totalRedemptions: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Campaign view shape used within the growth-api layer. */
export interface CampaignView {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly status: "draft" | "active" | "paused" | "ended";
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly couponIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Redemption record persisted after successful use. */
export interface RedemptionRecord {
  readonly id: string;
  readonly couponId: string;
  readonly couponCode: string;
  readonly userId: string;
  readonly orgId?: string;
  readonly orderId?: string;
  readonly originalBaseUnits: string;
  readonly discountedBaseUnits: string;
  readonly savedBaseUnits: string;
  readonly redeemedAt: string;
  readonly metadata?: Record<string, string>;
}

/** Port interface injected at bootstrap — allows real or in-memory storage. */
export interface CouponServicePort {
  findByCode(code: string): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }>;
  findById(id: string): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }>;
  listAll(campaignId?: string): Promise<readonly CouponView[]>;
  save(coupon: Omit<CouponView, "totalRedemptions" | "createdAt" | "updatedAt"> & { totalRedemptions?: number }): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }>;
  update(id: string, patch: Partial<Pick<CouponView, "status" | "description">>): Promise<{ ok: true; value: CouponView } | { ok: false; error: unknown }>;
  incrementRedemptions(id: string): Promise<void>;
  saveRedemption(record: RedemptionRecord): Promise<void>;
  listRedemptions(couponId: string): Promise<readonly RedemptionRecord[]>;
  countRedemptions(couponId: string): Promise<number>;
  countUserRedemptions(couponId: string, userId: string): Promise<number>;
  findCampaign(id: string): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }>;
  listCampaigns(): Promise<readonly CampaignView[]>;
  saveCampaign(campaign: Omit<CampaignView, "createdAt" | "updatedAt">): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }>;
  updateCampaign(id: string, patch: Partial<Pick<CampaignView, "name" | "description" | "status" | "startsAt" | "endsAt">>): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }>;
  addCouponToCampaign(campaignId: string, couponId: string): Promise<{ ok: true; value: CampaignView } | { ok: false; error: unknown }>;
}

const CreateCouponBodySchema = z.object({
  code: z.string().min(1).max(64).toUpperCase(),
  description: z.string().max(256).optional(),
  discount: DiscountSchema,
  rule: RedemptionRuleSchema,
  campaignId: z.string().optional(),
});

const RedeemBodySchema = z.object({
  userId: z.string().min(1),
  orgId: z.string().optional(),
  planId: z.string().optional(),
  tier: z.string().optional(),
  isFirstOrder: z.boolean().default(false),
  orderBaseUnits: z
    .string()
    .regex(/^\d+$/, "must be a non-negative integer string")
    .transform((v) => BigInt(v)),
  orderId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const CreateCampaignBodySchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(512).optional(),
  status: z.enum(["draft", "active", "paused", "ended"]).default("draft"),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  couponIds: z.array(z.string()).default([]),
});

const UpdateCampaignBodySchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(512).optional(),
  status: z.enum(["draft", "active", "paused", "ended"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

function applyDiscount(price: bigint, discount: z.infer<typeof DiscountSchema>): bigint {
  if (discount.kind === "percent") {
    const off = (price * BigInt(discount.basisPoints)) / 10000n;
    const after = price - off;
    return after < 0n ? 0n : after;
  }
  if (discount.kind === "fixed_usdc") {
    const after = price - discount.amountBaseUnits;
    return after < 0n ? 0n : after;
  }
  return price; // free_trial_days: no monetary discount
}

export class CouponsController {
  constructor(private readonly port: CouponServicePort) {}

  /** GET /coupons/code/:code — look up a coupon by redemption code. */
  async getByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = (req.params["code"] ?? "").toUpperCase();
      const result = await this.port.findByCode(code);
      if (!result.ok) { next(result.error); return; }
      res.json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  /** GET /coupons — list coupons, optionally filtered by campaignId query param. */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = typeof req.query["campaignId"] === "string" ? req.query["campaignId"] : undefined;
      const coupons = await this.port.listAll(campaignId);
      res.json({ success: true, data: coupons });
    } catch (e) { next(e); }
  }

  /** POST /coupons — create a new coupon. */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateCouponBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const nowIso = new Date().toISOString();
      const couponData = {
        id: newId("cpn"),
        code: parsed.data.code,
        description: parsed.data.description,
        discount: parsed.data.discount,
        rule: parsed.data.rule,
        status: "active" as const,
        campaignId: parsed.data.campaignId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const result = await this.port.save(couponData);
      if (!result.ok) { next(result.error); return; }
      res.status(201).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  /** POST /coupons/redeem — validate and apply a coupon to an order context. */
  async redeem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RedeemBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }

      const code = typeof req.body?.code === "string" ? (req.body.code as string).toUpperCase() : "";
      if (!code) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: "body.code is required" } });
        return;
      }

      const couponResult = await this.port.findByCode(code);
      if (!couponResult.ok) { next(couponResult.error); return; }
      const coupon = couponResult.value;

      if (coupon.status !== "active") {
        res.status(422).json({ success: false, error: { code: "COUPON_INACTIVE", message: `Coupon '${code}' is not active (status: ${coupon.status})` } });
        return;
      }

      const [totalCount, userCount] = await Promise.all([
        this.port.countRedemptions(coupon.id),
        this.port.countUserRedemptions(coupon.id, parsed.data.userId),
      ]);

      const nowIso = new Date().toISOString();
      const ctx: RuleContext = {
        nowIso,
        userId: parsed.data.userId,
        orgId: parsed.data.orgId,
        planId: parsed.data.planId,
        tier: parsed.data.tier,
        isFirstOrder: parsed.data.isFirstOrder,
        orderBaseUnits: parsed.data.orderBaseUnits,
        totalRedemptionCount: totalCount,
        userRedemptionCount: userCount,
      };

      const violations = evaluateRules(coupon.rule, ctx);
      if (violations.length > 0) {
        res.status(422).json({ success: false, error: { code: "COUPON_NOT_APPLICABLE", message: `Coupon rule violations: ${violations.join(", ")}` } });
        return;
      }

      const originalBaseUnits = parsed.data.orderBaseUnits;
      const discountedBaseUnits = applyDiscount(originalBaseUnits, coupon.discount);
      const savedBaseUnits = originalBaseUnits - discountedBaseUnits;

      const record: RedemptionRecord = {
        id: newId("rdm"),
        couponId: coupon.id,
        couponCode: coupon.code,
        userId: parsed.data.userId,
        orgId: parsed.data.orgId,
        orderId: parsed.data.orderId,
        originalBaseUnits: originalBaseUnits.toString(),
        discountedBaseUnits: discountedBaseUnits.toString(),
        savedBaseUnits: savedBaseUnits.toString(),
        redeemedAt: nowIso,
        metadata: parsed.data.metadata,
      };

      await Promise.all([
        this.port.saveRedemption(record),
        this.port.incrementRedemptions(coupon.id),
      ]);

      res.json({ success: true, data: record });
    } catch (e) { next(e); }
  }

  /** GET /coupons/campaigns/:id */
  async getCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"] ?? "";
      const result = await this.port.findCampaign(id);
      if (!result.ok) { next(result.error); return; }
      res.json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  /** GET /coupons/campaigns */
  async listCampaigns(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaigns = await this.port.listCampaigns();
      res.json({ success: true, data: campaigns });
    } catch (e) { next(e); }
  }

  /** Alias for getByCode — used by routes expecting getCouponByCode. */
  async getCouponByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.getByCode(req, res, next);
  }

  /** Alias for list — used by routes expecting listCoupons. */
  async listCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.list(req, res, next);
  }

  /** Alias for create — used by routes expecting createCoupon. */
  async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.create(req, res, next);
  }

  /** Alias for redeem — used by routes expecting redeemCoupon. */
  async redeemCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.redeem(req, res, next);
  }

  /** GET /coupons/:id — look up a coupon by its ID. */
  async getCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"] ?? "";
      const result = await this.port.findById(id);
      if (!result.ok) { next(result.error); return; }
      res.json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  /** GET /coupons/:id/redemptions — list redemptions for a coupon. */
  async listRedemptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"] ?? "";
      const records = await this.port.listRedemptions(id);
      res.json({ success: true, data: records });
    } catch (e) { next(e); }
  }

  /** DELETE /coupons/:id — mark a coupon as paused/deactivated. */
  async deactivateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"] ?? "";
      const result = await this.port.update(id, { status: "paused" as const });
      if (!result.ok) { next(result.error); return; }
      res.json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  /** POST /coupons/campaigns — create a new campaign. */
  async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateCampaignBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const nowIso = new Date().toISOString();
      const campaign: Omit<CampaignView, "createdAt" | "updatedAt"> = {
        id: newId("cam"),
        name: parsed.data.name,
        description: parsed.data.description,
        status: parsed.data.status,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        couponIds: parsed.data.couponIds,
      };
      const result = await this.port.saveCampaign(campaign);
      if (!result.ok) { next(result.error); return; }
      res.status(201).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  /** PUT /coupons/campaigns/:id — update campaign metadata. */
  async updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"] ?? "";
      const parsed = UpdateCampaignBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = await this.port.updateCampaign(id, parsed.data);
      if (!result.ok) { next(result.error); return; }
      res.json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  /** POST /coupons/campaigns/:id/coupons/:couponId — attach a coupon to a campaign. */
  async addCouponToCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = req.params["id"] ?? "";
      const couponId = req.params["couponId"] ?? "";
      const result = await this.port.addCouponToCampaign(campaignId, couponId);
      if (!result.ok) { next(result.error); return; }
      res.json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }
}
