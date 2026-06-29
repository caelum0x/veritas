// v1 Pricing controller: compute price, estimate monthly cost, and retrieve pricing table.
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { epochToIso, isErr, type Id } from "@veritas/core";
import { makeServiceContext, type PricingService, type ServiceContext } from "@veritas/services";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { respondOk, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";

const computePriceBodySchema = z.object({
  planId: z.string().min(1),
  metric: z.string().min(1),
  quantity: z.number().int().positive(),
});

const estimateMonthlyBodySchema = z.object({
  planId: z.string().min(1),
  organizationId: z.string().min(1),
  projectedUsage: z.record(z.string().min(1), z.number().int().nonnegative()),
});

const planIdParamSchema = z.object({
  planId: z.string().min(1),
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

export function makePricingController(pricingService: PricingService) {
  /** POST /v1/pricing/compute — compute cost for a quantity of a metric on a plan. */
  const computePrice = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const parsed = computePriceBodySchema.safeParse(req.body);
      if (!parsed.success) {
        respondError(res, 400, "VALIDATION", parsed.error.issues.map((i) => i.message).join("; "));
        return;
      }
      const ctx = buildContext(req);
      const result = await pricingService.computePrice(ctx, parsed.data as Parameters<typeof pricingService.computePrice>[1]);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  /** POST /v1/pricing/estimate — estimate monthly cost given projected usage quantities. */
  const estimateMonthly = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const parsed = estimateMonthlyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        respondError(res, 400, "VALIDATION", parsed.error.issues.map((i) => i.message).join("; "));
        return;
      }
      const ctx = buildContext(req);
      const result = await pricingService.estimateMonthly(ctx, parsed.data as Parameters<typeof pricingService.estimateMonthly>[1]);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  /** GET /v1/pricing/plans/:planId — retrieve full pricing table for a plan. */
  const getPricingTable = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const parsed = planIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        respondError(res, 400, "VALIDATION", parsed.error.issues.map((i) => i.message).join("; "));
        return;
      }
      const ctx = buildContext(req);
      const result = await pricingService.getPricingTable(ctx, { planId: parsed.data.planId });
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  return { computePrice, estimateMonthly, getPricingTable };
}
