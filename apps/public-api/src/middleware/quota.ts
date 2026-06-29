// Express middleware: enforce per-organization plan quotas before request processing.
import type { Request, Response, NextFunction } from "express";
import type { QuotaService } from "@veritas/services";
import type { Principal } from "@veritas/auth";
import { RateLimitedError, newId, epochToIso } from "@veritas/core";
import type { UsageMetric } from "@veritas/contracts";
import { makeServiceContext } from "@veritas/services";

/** Augmented request after auth middleware runs. */
type AuthedRequest = Request & { principal?: Principal };

export interface QuotaMiddlewareOptions {
  readonly quotaService: QuotaService;
  /** The metric name to check against the organization's quota. */
  readonly metric: string;
  /** Number of units this request consumes; defaults to 1. */
  readonly units?: number;
}

/**
 * Returns an Express middleware that asserts the authenticated organization
 * has sufficient quota for the given metric before allowing the request through.
 * Requires auth middleware to have populated req.principal.
 */
export function createQuotaMiddleware(
  opts: QuotaMiddlewareOptions,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { quotaService, metric, units = 1 } = opts;

  return async function quotaMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authedReq = req as AuthedRequest;

    if (!authedReq.principal) {
      next();
      return;
    }

    const requestId = newId("req");
    const now = epochToIso(Date.now());
    const servicePrincipal = {
      userId: authedReq.principal.userId ?? authedReq.principal.id,
      orgId: authedReq.principal.orgId,
      roles: [] as string[],
      apiKeyId: authedReq.principal.kind === "api_key" ? authedReq.principal.id : undefined,
    };
    const ctx = makeServiceContext(servicePrincipal, requestId, requestId, now);

    const result = await quotaService.checkQuota(ctx, {
      organizationId: authedReq.principal.orgId,
      metric: metric as UsageMetric,
      requested: units,
    });

    if (!result.ok) {
      next(result.error);
      return;
    }

    const check = result.value;
    res.setHeader("X-Quota-Limit", String(check.limit));
    res.setHeader("X-Quota-Remaining", String(check.remaining));
    res.setHeader("X-Quota-Used", String(check.used));

    if (!check.allowed) {
      next(
        new RateLimitedError({
          message: `Quota exceeded for metric '${metric}': ${check.used}/${check.limit} used`,
          details: { metric, limit: check.limit, used: check.used, requested: units },
        }),
      );
      return;
    }

    next();
  };
}
