// MFA controller — validates requests, delegates to MfaService, maps results to HTTP responses.

import type { Request, Response, NextFunction } from "express";
import { isOk, isErr } from "@veritas/core";
import {
  EnrollTotpBodySchema,
  IssueChallengeBodySchema,
  VerifyMfaBodySchema,
  ListFactorsQuerySchema,
  DeleteFactorParamsSchema,
} from "./mfa.schema.js";
import type { MfaService } from "./mfa.service.js";
import {
  toFactorResponse,
  toChallengeResponse,
  toEnrollTotpResponse,
  toVerifyOutcomeResponse,
  toEnrollmentStatusResponse,
} from "./mfa.mapper.js";

export class MfaController {
  constructor(private readonly service: MfaService) {}

  enrollTotp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = EnrollTotpBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }

    const result = await this.service.enrollTotp(parsed.data).catch((e: unknown) => { next(e); return null; });
    if (result === null) return;

    if (isErr(result)) {
      res.status(400).json({ success: false, error: { code: "ENROLL_FAILED", message: result.error.message } });
      return;
    }

    res.status(201).json({ success: true, data: toEnrollTotpResponse(result.value) });
  };

  listFactors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = ListFactorsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId query param is required" } });
      return;
    }

    const result = await this.service.listFactors(parsed.data.userId, parsed.data.activeOnly).catch((e: unknown) => { next(e); return null; });
    if (result === null) return;

    if (isErr(result)) {
      res.status(500).json({ success: false, error: { code: "LIST_FACTORS_FAILED", message: result.error.message } });
      return;
    }

    res.status(200).json({ success: true, data: result.value.map(toFactorResponse) });
  };

  deleteFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paramsParsed = DeleteFactorParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "factorId param is required" } });
      return;
    }

    const userId = typeof req.query["userId"] === "string" ? req.query["userId"] : "";
    if (!userId) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId query param is required" } });
      return;
    }

    const result = await this.service.deleteFactor(paramsParsed.data.factorId, userId).catch((e: unknown) => { next(e); return null; });
    if (result === null) return;

    if (isErr(result)) {
      const status = result.error.message.includes("not found") ? 404 : result.error.message.includes("belong") ? 403 : 400;
      res.status(status).json({ success: false, error: { code: "DELETE_FACTOR_FAILED", message: result.error.message } });
      return;
    }

    res.status(204).send();
  };

  issueChallenge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = IssueChallengeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId and factorId are required" } });
      return;
    }

    const result = await this.service.issueChallenge(parsed.data.userId, parsed.data.factorId).catch((e: unknown) => { next(e); return null; });
    if (result === null) return;

    if (isErr(result)) {
      const status = result.error.message.includes("not found") ? 404 : result.error.message.includes("belong") ? 403 : 400;
      res.status(status).json({ success: false, error: { code: "CHALLENGE_ISSUE_FAILED", message: result.error.message } });
      return;
    }

    res.status(201).json({ success: true, data: toChallengeResponse(result.value) });
  };

  verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = VerifyMfaBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }

    const result = await this.service.verify(parsed.data).catch((e: unknown) => { next(e); return null; });
    if (result === null) return;

    if (isErr(result)) {
      const msg = result.error.message;
      const status = msg.includes("expired") ? 410 : msg.includes("attempts") ? 429 : 401;
      res.status(status).json({ success: false, error: { code: "MFA_VERIFY_FAILED", message: msg } });
      return;
    }

    res.status(200).json({ success: true, data: toVerifyOutcomeResponse(result.value) });
  };

  enrollmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = typeof req.query["userId"] === "string" ? req.query["userId"] : "";
    if (!userId) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId query param is required" } });
      return;
    }

    const result = await this.service.getEnrollmentStatus(userId).catch((e: unknown) => { next(e); return null; });
    if (result === null) return;

    if (isErr(result)) {
      res.status(500).json({ success: false, error: { code: "STATUS_FAILED", message: result.error.message } });
      return;
    }

    res.status(200).json({ success: true, data: toEnrollmentStatusResponse(result.value) });
  };
}
