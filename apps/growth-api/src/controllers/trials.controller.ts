// Controller for trial lifecycle: create, query, extend, convert, and eligibility.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { type Result, epochToIso, ok, err, isErr } from "@veritas/core";
import type { UserId } from "@veritas/core";
import {
  newTrialId,
  TrialAlreadyActiveError,
  TrialNotFoundError,
  TrialNotActiveError,
  TrialExtensionLimitError,
} from "@veritas/trials";
import type { Trial, TrialId, TrialStatus } from "@veritas/trials";

const MAX_EXTENSIONS = 3;

/** Minimal in-process trial store — replaced by a persistence-backed store in production. */
const trialDb = new Map<TrialId, Trial>();

function findById(id: TrialId): Result<Trial, TrialNotFoundError> {
  const t = trialDb.get(id);
  return t !== undefined ? ok(t) : err(new TrialNotFoundError(id));
}

function findActiveByUserId(userId: UserId): Trial | null {
  for (const t of trialDb.values()) {
    if (t.userId === userId && (t.status === "active" || t.status === "extended")) return t;
  }
  return null;
}

function save(trial: Trial): Trial {
  trialDb.set(trial.id, trial);
  return trial;
}

const CreateBodySchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  durationDays: z.number().int().min(1).max(365),
  metadata: z.record(z.string()).optional(),
});

const ExtendBodySchema = z.object({
  daysToAdd: z.number().int().min(1).max(90),
  reason: z.string().min(1),
});

const ConvertBodySchema = z.object({
  planId: z.string().min(1),
});

export class TrialsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateBodySchema.parse(req.body);
      const userId = body.userId as UserId;
      const existing = findActiveByUserId(userId);
      if (existing !== null) { next(new TrialAlreadyActiveError(userId)); return; }

      const nowMs = Date.now();
      const expiresMs = nowMs + body.durationDays * 86_400_000;
      const trial: Trial = {
        id: newTrialId(),
        userId,
        planId: body.planId,
        status: "active",
        startsAt: epochToIso(nowMs),
        expiresAt: epochToIso(expiresMs),
        extendedAt: null,
        convertedAt: null,
        cancelledAt: null,
        extensionCount: 0,
        remindersSent: [],
        metadata: body.metadata ?? {},
        createdAt: epochToIso(nowMs),
        updatedAt: epochToIso(nowMs),
      };
      res.status(201).json({ success: true, data: save(trial) });
    } catch (e) { next(e); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trialId } = z.object({ trialId: z.string() }).parse(req.params);
      const result = findById(trialId as TrialId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async getActiveForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = z.object({ userId: z.string() }).parse(req.params);
      const trial = findActiveByUserId(userId as UserId);
      res.status(200).json({ success: true, data: trial });
    } catch (e) { next(e); }
  }

  async extend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trialId } = z.object({ trialId: z.string() }).parse(req.params);
      const body = ExtendBodySchema.parse(req.body);
      const found = findById(trialId as TrialId);
      if (isErr(found)) { next(found.error); return; }
      const trial = found.value;
      if (trial.status !== "active" && trial.status !== "extended") {
        next(new TrialNotActiveError(trial.id, trial.status)); return;
      }
      if (trial.extensionCount >= MAX_EXTENSIONS) {
        next(new TrialExtensionLimitError(trial.id, MAX_EXTENSIONS)); return;
      }
      const nowMs = Date.now();
      const currentExpiresMs = new Date(trial.expiresAt).getTime();
      const updated: Trial = {
        ...trial,
        status: "extended" as TrialStatus,
        expiresAt: epochToIso(currentExpiresMs + body.daysToAdd * 86_400_000),
        extendedAt: epochToIso(nowMs),
        extensionCount: trial.extensionCount + 1,
        updatedAt: epochToIso(nowMs),
      };
      res.status(200).json({ success: true, data: save(updated) });
    } catch (e) { next(e); }
  }

  async convert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trialId } = z.object({ trialId: z.string() }).parse(req.params);
      const body = ConvertBodySchema.parse(req.body);
      const found = findById(trialId as TrialId);
      if (isErr(found)) { next(found.error); return; }
      const trial = found.value;
      if (trial.status !== "active" && trial.status !== "extended") {
        next(new TrialNotActiveError(trial.id, trial.status)); return;
      }
      const nowMs = Date.now();
      const updated: Trial = {
        ...trial,
        status: "converted" as TrialStatus,
        planId: body.planId,
        convertedAt: epochToIso(nowMs),
        updatedAt: epochToIso(nowMs),
      };
      res.status(200).json({ success: true, data: save(updated) });
    } catch (e) { next(e); }
  }

  async checkEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = z.object({ userId: z.string() }).parse(req.params);
      const active = findActiveByUserId(userId as UserId);
      if (active !== null) {
        res.status(200).json({ success: true, data: { eligible: false, reason: "ALREADY_ACTIVE" } });
        return;
      }
      res.status(200).json({ success: true, data: { eligible: true, reason: null } });
    } catch (e) { next(e); }
  }
}
