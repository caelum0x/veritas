// Consent controller: validates requests, delegates to ConsentService, maps to HTTP responses.

import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import type { ConsentService } from "./consent.service.js";
import {
  GrantConsentBodySchema,
  DenyConsentBodySchema,
  WithdrawConsentBodySchema,
  ListConsentQuerySchema,
  CheckConsentQuerySchema,
  CaptureConsentBodySchema,
} from "./consent.schema.js";
import { toConsentResponse, toConsentCheckResponse } from "./consent.mapper.js";

export class ConsentController {
  constructor(private readonly service: ConsentService) {}

  async grant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = GrantConsentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const result = await this.service.grant(parsed.data);
      if (!isOk(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: toConsentResponse(result.value) });
    } catch (e) { next(e); }
  }

  async deny(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = DenyConsentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const result = await this.service.deny(parsed.data);
      if (!isOk(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: toConsentResponse(result.value) });
    } catch (e) { next(e); }
  }

  async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = WithdrawConsentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const result = await this.service.withdraw(parsed.data);
      if (!isOk(result)) {
        const msg = (result.error as Error).message;
        const status = msg.includes("No active consent") ? 404 : 422;
        res.status(status).json({ success: false, error: { code: status === 404 ? "NOT_FOUND" : "WITHDRAW_FAILED", message: msg } });
        return;
      }
      res.json({ success: true, data: toConsentResponse(result.value) });
    } catch (e) { next(e); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListConsentQuerySchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId query param required" } });
        return;
      }
      const result = await this.service.list(query.data);
      if (!isOk(result)) { next(result.error); return; }
      res.json({ success: true, data: result.value.map(toConsentResponse) });
    } catch (e) { next(e); }
  }

  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = CheckConsentQuerySchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId and purposeId query params required" } });
        return;
      }
      const result = await this.service.check(query.data.userId, query.data.purposeId);
      if (!isOk(result)) { next(result.error); return; }
      res.json({ success: true, data: toConsentCheckResponse(result.value) });
    } catch (e) { next(e); }
  }

  async capture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CaptureConsentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const result = await this.service.capture(parsed.data);
      if (!isOk(result)) { next(result.error); return; }
      const status = result.value.isUpdate ? 200 : 201;
      res.status(status).json({
        success: true,
        data: { consent: toConsentResponse(result.value.consent), isUpdate: result.value.isUpdate },
      });
    } catch (e) { next(e); }
  }
}
