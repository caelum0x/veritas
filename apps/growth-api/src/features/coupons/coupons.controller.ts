// Coupon feature controller: validates requests, delegates to CouponsService, sends HTTP responses.
import type { Request, Response, NextFunction } from "express";
import {
  CreateCouponBodySchema,
  RedeemCouponBodySchema,
  CreateCampaignBodySchema,
  UpdateCampaignBodySchema,
  CouponCodeParamSchema,
  CouponIdParamSchema,
  CampaignIdParamSchema,
  AddCouponToCampaignParamSchema,
  ListCouponsQuerySchema,
} from "./coupons.schema.js";
import { toCouponResponse, toCampaignResponse, toRedemptionResponse } from "./coupons.mapper.js";
import type { CouponsService } from "./coupons.service.js";

function sendError(res: Response, next: NextFunction, error: { kind: string; message?: string; violations?: string[]; cause?: unknown }): void {
  if (error.kind === "not_found") {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: error.message } });
  } else if (error.kind === "inactive") {
    res.status(422).json({ success: false, error: { code: "COUPON_INACTIVE", message: error.message } });
  } else if (error.kind === "rule_violation") {
    res.status(422).json({ success: false, error: { code: "COUPON_NOT_APPLICABLE", message: `Rule violations: ${(error.violations ?? []).join(", ")}` } });
  } else if (error.kind === "conflict") {
    res.status(409).json({ success: false, error: { code: "CONFLICT", message: error.message } });
  } else {
    next(error.cause);
  }
}

export class CouponsFeatureController {
  constructor(private readonly service: CouponsService) {}

  async getByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = CouponCodeParamSchema.parse(req.params);
      const result = await this.service.getByCode(code);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.json({ success: true, data: toCouponResponse(result.value) });
    } catch (e) { next(e); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = CouponIdParamSchema.parse(req.params);
      const result = await this.service.getById(id);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.json({ success: true, data: toCouponResponse(result.value) });
    } catch (e) { next(e); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = ListCouponsQuerySchema.parse(req.query);
      const coupons = await this.service.list(campaignId);
      res.json({ success: true, data: coupons.map(toCouponResponse) });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateCouponBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = await this.service.create(parsed.data);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.status(201).json({ success: true, data: toCouponResponse(result.value) });
    } catch (e) { next(e); }
  }

  async redeem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RedeemCouponBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = await this.service.redeem(parsed.data);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.json({ success: true, data: toRedemptionResponse(result.value) });
    } catch (e) { next(e); }
  }

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = CouponIdParamSchema.parse(req.params);
      const result = await this.service.deactivate(id);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.json({ success: true, data: toCouponResponse(result.value) });
    } catch (e) { next(e); }
  }

  async listRedemptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = CouponIdParamSchema.parse(req.params);
      const records = await this.service.listRedemptions(id);
      res.json({ success: true, data: records.map(toRedemptionResponse) });
    } catch (e) { next(e); }
  }

  async getCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = CampaignIdParamSchema.parse(req.params);
      const result = await this.service.getCampaign(id);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.json({ success: true, data: toCampaignResponse(result.value) });
    } catch (e) { next(e); }
  }

  async listCampaigns(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaigns = await this.service.listCampaigns();
      res.json({ success: true, data: campaigns.map(toCampaignResponse) });
    } catch (e) { next(e); }
  }

  async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateCampaignBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = await this.service.createCampaign(parsed.data);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.status(201).json({ success: true, data: toCampaignResponse(result.value) });
    } catch (e) { next(e); }
  }

  async updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = CampaignIdParamSchema.parse(req.params);
      const parsed = UpdateCampaignBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = await this.service.updateCampaign(id, parsed.data);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.json({ success: true, data: toCampaignResponse(result.value) });
    } catch (e) { next(e); }
  }

  async addCouponToCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, couponId } = AddCouponToCampaignParamSchema.parse(req.params);
      const result = await this.service.addCouponToCampaign(id, couponId);
      if (!result.ok) { sendError(res, next, result.error); return; }
      res.json({ success: true, data: toCampaignResponse(result.value) });
    } catch (e) { next(e); }
  }
}
