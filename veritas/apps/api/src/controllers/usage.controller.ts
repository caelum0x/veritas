// Usage controller handlers: list usage records, get a single record, ingest new usage, and org summary.
import type { Request, Response, NextFunction } from "express";
import { isErr, toPageRequest } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { toHttpError } from "../http/api-error.js";
import { respondOk, respondCreated, respondPage } from "../http/responder.js";
import {
  createUsageBodySchema,
  listUsageQuerySchema,
  usageIdParamSchema,
} from "../validators/usage.validator.js";

type UsageService = {
  list(opts: unknown): Promise<import("@veritas/core").Result<import("@veritas/core").Page<unknown>, import("@veritas/core").AppError>>;
  getById(id: string): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
  record(body: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
  summarizeByOrg(opts: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
};

function getUsageService(req: Request): UsageService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).container.usageService as UsageService;
}

function getOrgId(req: Request): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((req as any).orgId as string | undefined) ?? "";
}

export const listUsage = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = listUsageQuerySchema.parse(req.query);
    const pageRequest = toPageRequest({ cursor: query.cursor, limit: query.limit });
    const svc = getUsageService(req);
    const result = await svc.list({
      ...pageRequest,
      filters: {
        ...(query.metric ? { metric: query.metric } : {}),
        ...(query.orgId ? { orgId: query.orgId } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
      },
    });
    if (isErr(result)) throw toHttpError(result.error);
    respondPage(res, result.value);
  }
);

export const getUsageRecord = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = usageIdParamSchema.parse(req.params);
    const svc = getUsageService(req);
    const result = await svc.getById(id);
    if (isErr(result)) throw toHttpError(result.error);
    respondOk(res, result.value);
  }
);

export const createUsageRecord = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const body = createUsageBodySchema.parse(req.body);
    const svc = getUsageService(req);
    const result = await svc.record(body);
    if (isErr(result)) throw toHttpError(result.error);
    respondCreated(res, result.value);
  }
);

export const getOrgUsageSummary = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = listUsageQuerySchema.parse(req.query);
    const svc = getUsageService(req);
    const orgId = getOrgId(req);
    const result = await svc.summarizeByOrg({
      orgId,
      from: query.from,
      to: query.to,
    });
    if (isErr(result)) throw toHttpError(result.error);
    respondOk(res, result.value);
  }
);
