// Referrals feature controller: validates HTTP requests and delegates to ReferralsService.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  CreateProgramBodySchema,
  RegisterClickBodySchema,
  AttributeSignupBodySchema,
  IssueRewardsParamsSchema,
  ListByReferrerParamsSchema,
  ListByReferrerQuerySchema,
  GenerateCodeParamsSchema,
  GetProgramParamsSchema,
} from "./referrals.schema.js";
import {
  toReferralResponse,
  toProgramResponse,
  toRewardResponse,
} from "./referrals.mapper.js";
import type { ReferralsService } from "./referrals.service.js";

export class ReferralsController {
  constructor(private readonly svc: ReferralsService) {}

  async createProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateProgramBodySchema.parse(req.body);
      const result = await this.svc.createProgram(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: toProgramResponse(result.value) });
    } catch (e) { next(e); }
  }

  async getProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { programId } = GetProgramParamsSchema.parse(req.params);
      const result = await this.svc.getProgram(programId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toProgramResponse(result.value) });
    } catch (e) { next(e); }
  }

  async listPrograms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.svc.listPrograms();
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value.map(toProgramResponse) });
    } catch (e) { next(e); }
  }

  async registerClick(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = RegisterClickBodySchema.parse(req.body);
      const result = await this.svc.registerClick(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toReferralResponse(result.value) });
    } catch (e) { next(e); }
  }

  async attributeSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = AttributeSignupBodySchema.parse(req.body);
      const result = await this.svc.attributeSignup(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toReferralResponse(result.value) });
    } catch (e) { next(e); }
  }

  async issueRewards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { referralId } = IssueRewardsParamsSchema.parse(req.params);
      const result = await this.svc.issueRewards({ referralId });
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value.map(toRewardResponse) });
    } catch (e) { next(e); }
  }

  async listByReferrer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { referrerId } = ListByReferrerParamsSchema.parse(req.params);
      const { programId } = ListByReferrerQuerySchema.parse(req.query);
      const result = await this.svc.listByReferrer(referrerId, programId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value.map(toReferralResponse) });
    } catch (e) { next(e); }
  }

  generateCode(req: Request, res: Response, next: NextFunction): void {
    try {
      const { userId } = GenerateCodeParamsSchema.parse(req.params);
      const code = this.svc.generateCodeForUser(userId);
      res.status(200).json({ success: true, data: { code } });
    } catch (e) { next(e); }
  }
}
