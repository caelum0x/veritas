// v1 Usage controller: list metered usage events and summarize totals for the caller's org.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type UsageMeteringService } from "@veritas/services";
import { UsageMetricSchema } from "@veritas/contracts";
import type { Principal } from "@veritas/auth";
import { ApiError } from "../http/api-error.js";

type AuthedRequest = Request & { principal?: Principal };

const listUsageQuerySchema = z.object({
  subscriptionId: z.string().optional(),
  metric: UsageMetricSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const summarizeQuerySchema = z.object({
  metric: UsageMetricSchema,
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

function buildContext(req: AuthedRequest) {
  const principal = req.principal;
  if (!principal) throw ApiError.unauthorized();
  const requestId = newId("req");
  const now = epochToIso(Date.now());
  return {
    ctx: makeServiceContext(
      { userId: principal.userId ?? principal.id, orgId: principal.orgId, roles: [], apiKeyId: principal.kind === "api_key" ? principal.id : undefined },
      requestId,
      requestId,
      now,
    ),
    orgId: principal.orgId,
  };
}

export function makeUsageController(usageMeteringService: UsageMeteringService) {
  const listUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const parsed = listUsageQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid query parameters", parsed.error.flatten()));
        return;
      }
      const result = await usageMeteringService.list(ctx, { organizationId: orgId, ...parsed.data });
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      const page = result.value;
      res.status(200).json({
        success: true,
        data: page.items,
        meta: { nextCursor: page.nextCursor ?? null, hasMore: page.hasMore },
      });
    } catch (err) {
      next(err);
    }
  };

  const getUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx } = buildContext(req as AuthedRequest);
      const id = req.params["id"];
      if (!id) { next(ApiError.badRequest("Missing id")); return; }
      const result = await usageMeteringService.getById(ctx, id);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  const summarizeUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const parsed = summarizeQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid query parameters", parsed.error.flatten()));
        return;
      }
      const result = await usageMeteringService.summarize(ctx, { organizationId: orgId, ...parsed.data });
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  return { listUsage, getUsage, summarizeUsage };
}
