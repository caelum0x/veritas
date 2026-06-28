// Express middleware: asynchronously records a usage event after response is sent.
import type { Request, Response, NextFunction } from "express";
import type { UsageMeteringService } from "@veritas/services";
import type { Principal } from "@veritas/auth";
import { makeServiceContext } from "@veritas/services";
import { newId, epochToIso } from "@veritas/core";
import type { UsageMetric } from "@veritas/contracts";
import type { Logger } from "@veritas/observability";

/** Augmented request after auth middleware populates principal. */
type AuthedRequest = Request & { principal?: Principal };

export interface UsageMeterMiddlewareOptions {
  readonly usageMeteringService: UsageMeteringService;
  readonly logger: Logger;
  /** The metric to record on each matched request. */
  readonly metric: UsageMetric;
  /** Units consumed per request; defaults to 1. */
  readonly units?: number;
  /** Only record usage when response status is below this threshold; defaults to 400. */
  readonly maxSuccessStatus?: number;
}

/**
 * Returns an Express middleware that fires-and-forgets a usage record after
 * the response finishes. Requires auth middleware to have run first.
 * Errors from the metering service are logged but never propagate to the client.
 */
export function createUsageMeterMiddleware(
  opts: UsageMeterMiddlewareOptions,
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    usageMeteringService,
    logger,
    metric,
    units = 1,
    maxSuccessStatus = 400,
  } = opts;

  return function usageMeterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const authedReq = req as AuthedRequest;

    res.on("finish", () => {
      if (!authedReq.principal) return;
      if (res.statusCode >= maxSuccessStatus) return;

      const principal = authedReq.principal;
      const requestId = newId("req");
      const now = epochToIso(Date.now());

      const servicePrincipal = {
        userId: principal.userId ?? principal.id,
        orgId: principal.orgId,
        roles: [] as string[],
        apiKeyId: principal.kind === "api_key" ? principal.id : undefined,
      };

      const ctx = makeServiceContext(servicePrincipal, requestId, requestId, now);

      usageMeteringService
        .record(ctx, {
          organizationId: principal.orgId,
          subscriptionId: null,
          metric,
          quantity: units,
          idempotencyKey: null,
        })
        .then((result) => {
          if (!result.ok) {
            logger.warn("Failed to record usage", {
              metric,
              orgId: principal.orgId,
              error: result.error instanceof Error ? result.error.message : String(result.error),
            });
          }
        })
        .catch((err: unknown) => {
          logger.error("Unexpected error recording usage", {
            metric,
            orgId: principal.orgId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    });

    next();
  };
}
