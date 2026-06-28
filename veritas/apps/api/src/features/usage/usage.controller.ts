// Usage feature controller: validates requests, calls feature service, maps to HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { asyncHandler } from "../../http/async-handler.js";
import { toHttpError } from "../../http/api-error.js";
import { respondOk, respondCreated, respondPage } from "../../http/responder.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  listUsageQuerySchema,
  usageIdParamSchema,
  createUsageBodySchema,
  usageSummaryQuerySchema,
} from "./usage.schema.js";
import { toUsageResponse, toUsageSummaryResponse } from "./usage.mapper.js";
import type { UsageFeatureService } from "./usage.service.js";

export function makeUsageController(service: UsageFeatureService) {
  const listUsage = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = listUsageQuerySchema.parse(req.query);
      const result = await service.list(req as AuthenticatedRequest, query);
      if (isErr(result)) throw toHttpError(result.error);
      const page = {
        ...result.value,
        items: result.value.items.map(toUsageResponse),
      };
      respondPage(res, page);
    },
  );

  const getUsageRecord = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = usageIdParamSchema.parse(req.params);
      const result = await service.getById(req as AuthenticatedRequest, id);
      if (isErr(result)) throw toHttpError(result.error);
      respondOk(res, toUsageResponse(result.value));
    },
  );

  const createUsageRecord = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const body = createUsageBodySchema.parse(req.body);
      const result = await service.record(req as AuthenticatedRequest, body);
      if (isErr(result)) throw toHttpError(result.error);
      respondCreated(res, toUsageResponse(result.value));
    },
  );

  const getUsageSummary = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = usageSummaryQuerySchema.parse(req.query);
      const result = await service.summarize(req as AuthenticatedRequest, query);
      if (isErr(result)) throw toHttpError(result.error);
      respondOk(res, toUsageSummaryResponse(result.value));
    },
  );

  return { listUsage, getUsageRecord, createUsageRecord, getUsageSummary };
}
