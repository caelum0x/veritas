// v1 Usage routes: list usage records, get one by ID, record usage, and summarize by org.
import { Router } from "express";
import { z } from "zod";
import { epochToIso, newId, isErr, apiPage, type Id } from "@veritas/core";
import {
  makeServiceContext,
  type ApiKeyService,
  type UsageMeteringService,
  type ServiceContext,
} from "@veritas/services";
import type { RateLimiter } from "@veritas/rate-limit";
import { CreateUsageSchema, UsageMetricSchema } from "@veritas/contracts";
import { createAuthMiddleware, requireScope } from "../middleware/auth.js";
import { createRateLimitMiddleware } from "../middleware/rate-limit.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { respondOk, respondCreated, sendPage as respondPage, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import type { Request, Response, NextFunction } from "express";

const listUsageQuerySchema = z.object({
  organizationId: z.string().optional(),
  subscriptionId: z.string().optional(),
  metric: UsageMetricSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const usageIdParamSchema = z.object({
  id: z.string().min(1),
});

const summarizeQuerySchema = z.object({
  metric: UsageMetricSchema,
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

function toId(value: string): Id<string> {
  return value as Id<string>;
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

function buildSystemContext() {
  const reqId = newId("sys");
  return makeServiceContext(
    { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

function buildContext(req: Request): ServiceContext {
  const authed = req as AuthenticatedRequest;
  const reqId = (req as Request & { requestId?: string }).requestId ?? "unknown";
  return makeServiceContext(
    {
      userId: toId(authed.userId ?? "anonymous"),
      orgId: authed.orgId ? toId(authed.orgId) : undefined,
      roles: authed.scopes ?? [],
      apiKeyId: authed.apiKeyId ? toId(authed.apiKeyId) : undefined,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export interface UsageRouterDeps {
  readonly usageMeteringService: UsageMeteringService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
}

export function usageRouter(deps: UsageRouterDeps): Router {
  const router = Router();

  const auth = createAuthMiddleware({
    validateApiKey: async (rawKey: string) => {
      const ctx = buildSystemContext();
      const result = await deps.apiKeyService.validateApiKey(ctx, { rawKey });
      if (!result.ok || !result.value.valid || result.value.apiKey === null) {
        return null;
      }
      const key = result.value.apiKey;
      return {
        apiKeyId: key.id,
        orgId: key.organizationId ?? "",
        userId: key.userId ?? undefined,
        scopes: key.scopes ?? [],
        active: key.revokedAt === null || key.revokedAt === undefined,
      };
    },
  });

  const rl120 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:usage:read:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  const rl30 = createRateLimitMiddleware({
    limiter: deps.rateLimiter,
    keyFn: (req) => `rl:v1:usage:write:${(req as { principal?: { id: string } }).principal?.id ?? req.ip}`,
  });

  router.use(auth);

  router.get(
    "/",
    rl120,
    asyncHandler(async (req, res, _next) => {
      const query = listUsageQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const authed = req as AuthenticatedRequest;
      const orgId = query.organizationId ?? authed.orgId ?? "";
      const result = await deps.usageMeteringService.list(ctx, {
        organizationId: orgId,
        subscriptionId: query.subscriptionId,
        metric: query.metric,
        from: query.from,
        to: query.to,
        cursor: query.cursor,
        limit: query.limit ?? 20,
      });
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondPage(res, result.value);
    }),
  );

  router.post(
    "/",
    rl30,
    requireScope("usage:write"),
    asyncHandler(async (req, res, _next) => {
      const body = CreateUsageSchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await deps.usageMeteringService.record(ctx, body);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondCreated(res, result.value);
    }),
  );

  router.get(
    "/summarize",
    rl120,
    asyncHandler(async (req, res, _next) => {
      const query = summarizeQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const authed = req as AuthenticatedRequest;
      const orgId = authed.orgId ?? "";
      const result = await deps.usageMeteringService.summarize(ctx, {
        organizationId: orgId,
        metric: query.metric,
        from: query.from,
        to: query.to,
      });
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    }),
  );

  router.get(
    "/:id",
    rl120,
    asyncHandler(async (req, res, _next) => {
      const { id } = usageIdParamSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await deps.usageMeteringService.getById(ctx, id);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    }),
  );

  return router;
}
