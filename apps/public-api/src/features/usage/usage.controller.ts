// Usage feature controller: validates requests, calls UsageService, returns HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { respondOk, respondCreated, sendPage, respondError } from "../../http/responder.js";
import { toHttpError, ApiError } from "../../http/api-error.js";
import { UsageService } from "./usage.service.js";
import {
  RecordUsageBodySchema,
  ListUsageQuerySchema,
  UsageSummaryQuerySchema,
  UsageIdParamSchema,
} from "./usage.schema.js";
import { toUsageDto, toUsageSummaryDto } from "./usage.mapper.js";

export class UsageController {
  constructor(private readonly service: UsageService) {}

  listUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authed = req as AuthenticatedRequest;
      const orgId = authed.orgId;
      if (!orgId) { next(ApiError.unauthorized()); return; }

      const parsed = ListUsageQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid query parameters", parsed.error.flatten()));
        return;
      }

      const result = await this.service.listUsage(orgId, parsed.data);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      sendPage(res, result.value);
    } catch (err) { next(err); }
  };

  getUsageById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authed = req as AuthenticatedRequest;
      const orgId = authed.orgId;
      if (!orgId) { next(ApiError.unauthorized()); return; }

      const parsed = UsageIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid path parameter", parsed.error.flatten()));
        return;
      }

      const result = await this.service.getUsageById(orgId, parsed.data.id);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, toUsageDto(result.value));
    } catch (err) { next(err); }
  };

  recordUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authed = req as AuthenticatedRequest;
      const orgId = authed.orgId;
      if (!orgId) { next(ApiError.unauthorized()); return; }

      const parsed = RecordUsageBodySchema.safeParse(req.body);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid request body", parsed.error.flatten()));
        return;
      }

      const result = await this.service.recordUsage(orgId, parsed.data);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondCreated(res, toUsageDto(result.value));
    } catch (err) { next(err); }
  };

  summarizeUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authed = req as AuthenticatedRequest;
      const orgId = authed.orgId;
      if (!orgId) { next(ApiError.unauthorized()); return; }

      const parsed = UsageSummaryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid query parameters", parsed.error.flatten()));
        return;
      }

      const result = await this.service.summarizeUsage(orgId, parsed.data);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, toUsageSummaryDto(result.value));
    } catch (err) { next(err); }
  };

  flushMeterEvents = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const events = this.service.flushMeterEvents();
      respondOk(res, { flushed: events.length, events });
    } catch (err) { next(err); }
  };
}
