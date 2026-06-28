// Controller for referral program and referral CRUD/action endpoints.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import { CreateProgramSchema, AttributionRequestSchema } from "@veritas/referrals";
import type { ReferralService } from "../../../../packages/referrals/src/service.js";

const RegisterClickSchema = z.object({
  programId: z.string().min(1),
  referrerId: z.string().min(1),
  code: z.string().min(1),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

const AttributeSchema = z.object({
  referralId: z.string().min(1),
  request: AttributionRequestSchema,
  fraudSignals: z.object({
    isSelfReferral: z.boolean().default(false),
    isDuplicateReferee: z.boolean().default(false),
    suspiciousIp: z.boolean().default(false),
    reason: z.string().optional(),
  }).default({ isSelfReferral: false, isDuplicateReferee: false, suspiciousIp: false }),
});

const RedeemRewardSchema = z.object({
  referralId: z.string().min(1),
  recipientId: z.string().min(1),
  rewardIndex: z.number().int().nonnegative().default(0),
});

export class ReferralsController {
  constructor(private readonly svc: ReferralService) {}

  async createProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateProgramSchema.parse(req.body);
      const result = await this.svc.createProgram(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async registerClick(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = RegisterClickSchema.parse(req.body);
      const result = await this.svc.registerClick(body.programId, body.referrerId, {
        code: body.code,
        ip: body.ip,
        userAgent: body.userAgent,
      });
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async attributeSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = AttributeSchema.parse(req.body);
      const result = await this.svc.attributeSignup({
        referralId: body.referralId,
        request: body.request,
        fraudSignals: body.fraudSignals,
      });
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async issueRewards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { referralId } = z.object({ referralId: z.string() }).parse(req.params);
      const result = await this.svc.issueRewards({ referralId });
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async listByReferrer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { referrerId } = z.object({ referrerId: z.string() }).parse(req.params);
      const { programId } = z.object({ programId: z.string().optional() }).parse(req.query);
      const result = await this.svc.getReferralsByReferrer(referrerId, programId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async generateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = z.object({ userId: z.string() }).parse(req.params);
      const code = this.svc.generateCodeForUser(userId);
      res.status(200).json({ success: true, data: { code } });
    } catch (e) { next(e); }
  }
}
