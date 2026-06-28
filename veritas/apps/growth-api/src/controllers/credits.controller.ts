// Controller for credit balance, grant, consume, reserve, and release endpoints.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import { creditAmountSchema, creditSourceSchema } from "@veritas/credits";
import type { CreditService } from "../../../../packages/credits/src/service.js";

const GrantBodySchema = z.object({
  userId: z.string().min(1),
  amount: creditAmountSchema,
  source: creditSourceSchema,
  reason: z.string().min(1),
  expiresAt: z.string().datetime().nullable().default(null),
  metadata: z.record(z.string()).optional(),
});

const ConsumeBodySchema = z.object({
  userId: z.string().min(1),
  amount: creditAmountSchema,
  note: z.string().min(1),
  referenceId: z.string().optional(),
});

const ReserveBodySchema = z.object({
  userId: z.string().min(1),
  amount: creditAmountSchema,
  note: z.string().min(1),
  referenceId: z.string().optional(),
  expiresAt: z.string().datetime().nullable().default(null),
});

const ReleaseBodySchema = z.object({
  reservationId: z.string().min(1),
  consume: z.boolean(),
  amount: creditAmountSchema.optional(),
  note: z.string().optional(),
});

export class CreditsController {
  constructor(private readonly svc: CreditService) {}

  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = z.object({ userId: z.string() }).parse(req.params);
      const result = await this.svc.getBalance(userId as Parameters<typeof this.svc.getBalance>[0]);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async grant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = GrantBodySchema.parse(req.body);
      const result = await this.svc.grant(body as Parameters<typeof this.svc.grant>[0]);
      if (isErr(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async consume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ConsumeBodySchema.parse(req.body);
      const result = await this.svc.consume(body as Parameters<typeof this.svc.consume>[0]);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async reserve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ReserveBodySchema.parse(req.body);
      const result = await this.svc.reserve(body as Parameters<typeof this.svc.reserve>[0]);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async release(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ReleaseBodySchema.parse(req.body);
      const result = await this.svc.release(body as Parameters<typeof this.svc.release>[0]);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async expireCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = z.object({ userId: z.string() }).parse(req.params);
      const result = await this.svc.expireCredits(userId as Parameters<typeof this.svc.expireCredits>[0]);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: { expired: result.value } });
    } catch (e) { next(e); }
  }
}
