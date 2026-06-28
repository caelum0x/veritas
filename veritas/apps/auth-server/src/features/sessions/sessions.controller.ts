// Sessions controller — validates requests and delegates to SessionsService, returning HTTP responses.

import type { Request, Response, NextFunction } from "express";
import { isOk, isErr } from "@veritas/core";
import {
  CreateSessionBodySchema,
  VerifySessionBodySchema,
  RevokeSessionParamsSchema,
  RevokeSessionBodySchema,
  ListSessionsQuerySchema,
} from "./sessions.schema.js";
import type { SessionsService } from "./sessions.service.js";
import { toSessionResponse, toVerifiedSessionResponse } from "./sessions.mapper.js";

export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  create = (req: Request, res: Response, next: NextFunction): void => {
    const parsed = CreateSessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }

    const result = this.service.create(parsed.data);

    if (isErr(result)) {
      next(result.error);
      return;
    }

    res.status(201).json({ success: true, data: result.value });
  };

  verify = (req: Request, res: Response, next: NextFunction): void => {
    const parsed = VerifySessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "token is required" } });
      return;
    }

    const result = this.service.verify(parsed.data.token);

    if (isErr(result)) {
      res.status(401).json({ success: false, error: { code: "SESSION_INVALID", message: result.error.message } });
      return;
    }

    res.status(200).json({ success: true, data: toVerifiedSessionResponse(result.value) });
  };

  revoke = (req: Request, res: Response, next: NextFunction): void => {
    const paramsParsed = RevokeSessionParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "sessionId param is required" } });
      return;
    }

    const bodyParsed = RevokeSessionBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } });
      return;
    }

    const result = this.service.revoke(paramsParsed.data.sessionId, bodyParsed.data.userId);

    if (isErr(result)) {
      const msg = result.error.message;
      const status = msg.includes("not found") ? 404 : msg.includes("Cannot revoke") ? 403 : 409;
      res.status(status).json({ success: false, error: { code: "SESSION_REVOKE_FAILED", message: msg } });
      return;
    }

    res.status(204).send();
  };

  list = (req: Request, res: Response, next: NextFunction): void => {
    const parsed = ListSessionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId query param is required" } });
      return;
    }

    const result = this.service.listByUser(parsed.data.userId);

    if (isErr(result)) {
      next(result.error);
      return;
    }

    res.status(200).json({ success: true, data: result.value.map(toSessionResponse) });
  };

  revokeAll = (req: Request, res: Response, next: NextFunction): void => {
    const userId = typeof req.body?.["userId"] === "string" ? req.body["userId"] as string : "";
    if (!userId) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } });
      return;
    }

    const result = this.service.revokeAllByUser(userId);

    if (isErr(result)) {
      next(result.error);
      return;
    }

    res.status(200).json({ success: true, data: { revokedCount: result.value } });
  };
}
