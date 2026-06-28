// Credits feature controller: validates HTTP requests and delegates to CreditsService.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  GrantBodySchema,
  ConsumeBodySchema,
  ReserveBodySchema,
  ReleaseBodySchema,
  UserIdParamsSchema,
  LedgerQuerySchema,
} from "./credits.schema.js";
import {
  toBalanceResponse,
  toGrantResponse,
  toLedgerEntryResponse,
} from "./credits.mapper.js";
import type { CreditsService } from "./credits.service.js";

export class CreditsController {
  constructor(private readonly svc: CreditsService) {}

  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserIdParamsSchema.parse(req.params);
      const result = await this.svc.getBalance(userId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toBalanceResponse(result.value) });
    } catch (e) { next(e); }
  }

  async grant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = GrantBodySchema.parse(req.body);
      const result = await this.svc.grant(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: toGrantResponse(result.value) });
    } catch (e) { next(e); }
  }

  async consume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ConsumeBodySchema.parse(req.body);
      const result = await this.svc.consume(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toBalanceResponse(result.value) });
    } catch (e) { next(e); }
  }

  async reserve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ReserveBodySchema.parse(req.body);
      const result = await this.svc.reserve(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: { reservationId: result.value } });
    } catch (e) { next(e); }
  }

  async release(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ReleaseBodySchema.parse(req.body);
      const result = await this.svc.release(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toBalanceResponse(result.value) });
    } catch (e) { next(e); }
  }

  async expireCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserIdParamsSchema.parse(req.params);
      const result = await this.svc.expireCredits(userId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: { expired: result.value } });
    } catch (e) { next(e); }
  }

  async getLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserIdParamsSchema.parse(req.params);
      const { kind } = LedgerQuerySchema.parse(req.query);
      const result = await this.svc.getLedger(userId, kind);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value.map(toLedgerEntryResponse) });
    } catch (e) { next(e); }
  }
}
