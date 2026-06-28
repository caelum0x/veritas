// Consent controller: grant, deny, withdraw, and list consent records via ConsentStore.

import type { Request, Response, NextFunction } from "express";
import { epochToIso, type Result } from "@veritas/core";
import { CreateConsentSchema, makeConsent, type Consent } from "@veritas/consent";
import { z } from "zod";

/** Minimal store interface for consent operations (matches @veritas/consent InMemoryConsentStore shape). */
export interface IConsentStore {
  saveConsent(consent: Consent): Consent;
  listConsents(filter?: { userId?: string; purposeId?: string; status?: Consent["status"] }): ReadonlyArray<Consent>;
  updateConsent(consent: Consent): Result<Consent, Error>;
}

const WithdrawSchema = z.object({
  userId: z.string().min(1),
  purposeId: z.string().min(1),
});

export class ConsentController {
  constructor(private readonly store: IConsentStore) {}

  async grant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateConsentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid consent body", issues: parsed.error.issues } });
        return;
      }
      const now = epochToIso(Date.now());
      const consent = makeConsent({ ...parsed.data, status: "granted" }, now);
      const saved = this.store.saveConsent(consent);
      res.status(201).json({ success: true, data: saved });
    } catch (err) {
      next(err);
    }
  }

  async deny(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateConsentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid consent body", issues: parsed.error.issues } });
        return;
      }
      const now = epochToIso(Date.now());
      const consent = makeConsent({ ...parsed.data, status: "denied" }, now);
      const saved = this.store.saveConsent(consent);
      res.status(201).json({ success: true, data: saved });
    } catch (err) {
      next(err);
    }
  }

  async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = WithdrawSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId and purposeId required", issues: parsed.error.issues } });
        return;
      }
      const { userId, purposeId } = parsed.data;
      const records = this.store.listConsents({ userId, purposeId, status: "granted" });
      const active = records[0];
      if (!active) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `No active consent for user ${userId} and purpose ${purposeId}` } });
        return;
      }
      const now = epochToIso(Date.now());
      const withdrawn: Consent = { ...active, status: "withdrawn", withdrawnAt: now, updatedAt: now };
      const updateResult = this.store.updateConsent(withdrawn);
      if (!updateResult.ok) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: (updateResult.error as Error).message } });
        return;
      }
      res.json({ success: true, data: updateResult.value });
    } catch (err) {
      next(err);
    }
  }

  async listByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query["userId"];
      if (typeof userId !== "string" || userId.length === 0) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId query param required" } });
        return;
      }
      const records = this.store.listConsents({ userId });
      res.json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  }

  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query["userId"];
      const purposeId = req.query["purposeId"];
      if (typeof userId !== "string" || userId.length === 0 || typeof purposeId !== "string" || purposeId.length === 0) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId and purposeId query params required" } });
        return;
      }
      const records = this.store.listConsents({ userId, purposeId, status: "granted" });
      res.json({ success: true, data: { granted: records.length > 0 } });
    } catch (err) {
      next(err);
    }
  }
}
