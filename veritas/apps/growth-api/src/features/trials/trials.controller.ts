// Trial feature controller: validates requests, calls TrialsService, sends HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { AppError } from "@veritas/core";
import {
  CreateTrialBodySchema,
  ExtendTrialBodySchema,
  ConvertTrialBodySchema,
  TrialIdParamSchema,
  UserIdParamSchema,
} from "./trials.schema.js";
import { toTrialResponse, toEligibilityResponse } from "./trials.mapper.js";
import type { TrialsService } from "./trials.service.js";

function sendDomainError(res: Response, next: NextFunction, error: AppError): void {
  if (error.status === 404) {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: error.message } });
  } else if (error.status === 409) {
    res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
  } else if (error.status === 422) {
    res.status(422).json({ success: false, error: { code: error.code, message: error.message } });
  } else {
    next(error);
  }
}

export class TrialsFeatureController {
  constructor(private readonly service: TrialsService) {}

  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = CreateTrialBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = this.service.create(parsed.data);
      if (!result.ok) { sendDomainError(res, next, result.error); return; }
      res.status(201).json({ success: true, data: toTrialResponse(result.value) });
    } catch (e) { next(e); }
  }

  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const { trialId } = TrialIdParamSchema.parse(req.params);
      const result = this.service.getById(trialId);
      if (!result.ok) { sendDomainError(res, next, result.error); return; }
      res.json({ success: true, data: toTrialResponse(result.value) });
    } catch (e) { next(e); }
  }

  getActiveForUser(req: Request, res: Response, next: NextFunction): void {
    try {
      const { userId } = UserIdParamSchema.parse(req.params);
      const trial = this.service.getActiveForUser(userId);
      res.json({ success: true, data: trial !== null ? toTrialResponse(trial) : null });
    } catch (e) { next(e); }
  }

  extend(req: Request, res: Response, next: NextFunction): void {
    try {
      const { trialId } = TrialIdParamSchema.parse(req.params);
      const parsed = ExtendTrialBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = this.service.extend(trialId, parsed.data);
      if (!result.ok) { sendDomainError(res, next, result.error); return; }
      res.json({ success: true, data: toTrialResponse(result.value) });
    } catch (e) { next(e); }
  }

  convert(req: Request, res: Response, next: NextFunction): void {
    try {
      const { trialId } = TrialIdParamSchema.parse(req.params);
      const parsed = ConvertTrialBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } });
        return;
      }
      const result = this.service.convert(trialId, parsed.data);
      if (!result.ok) { sendDomainError(res, next, result.error); return; }
      res.json({ success: true, data: toTrialResponse(result.value) });
    } catch (e) { next(e); }
  }

  checkEligibility(req: Request, res: Response, next: NextFunction): void {
    try {
      const { userId } = UserIdParamSchema.parse(req.params);
      const { eligible, reason } = this.service.checkEligibility(userId);
      res.json({ success: true, data: toEligibilityResponse(eligible, reason) });
    } catch (e) { next(e); }
  }
}
