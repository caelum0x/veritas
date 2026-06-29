// Tenant scoping middleware — resolves and attaches the active tenant to each admin request.

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { NotFoundError, brand } from "@veritas/core";
import type { Tenant, TenantStore, TenantId } from "@veritas/tenancy";
import { runWithTenant } from "@veritas/tenancy";
import type { Logger } from "@veritas/observability";

/** Header used to identify the target tenant in admin requests. */
export const ADMIN_TENANT_HEADER = "x-tenant-id";

/** Cast a raw string to a branded TenantId. */
function toTenantId(value: string): TenantId {
  return brand<string, "TenantId">(value) as unknown as TenantId;
}

/** Augment Express Request to carry the resolved Tenant. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

export interface AdminTenantMiddlewareOptions {
  readonly store: TenantStore;
  readonly logger: Logger;
  /**
   * When true, missing/unknown tenant header causes a 404.
   * When false, the middleware is a no-op if the header is absent.
   * Defaults to false so that non-tenant-scoped admin routes still work.
   */
  readonly required?: boolean;
}

/**
 * Returns an Express middleware that resolves the target tenant from the
 * X-Tenant-Id request header and attaches it to req.tenant.
 * Used by admin routes that need to operate on behalf of a specific tenant.
 */
export function adminTenantMiddleware({
  store,
  logger,
  required = false,
}: AdminTenantMiddlewareOptions): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const rawId = req.headers[ADMIN_TENANT_HEADER] as string | undefined;

    if (!rawId) {
      if (required) {
        next(new NotFoundError({ message: `Header ${ADMIN_TENANT_HEADER} is required for this endpoint` }));
        return;
      }
      next();
      return;
    }

    try {
      const tenantId = toTenantId(rawId);
      const tenant = await store.findById(tenantId);

      if (!tenant) {
        next(new NotFoundError({ message: `Tenant '${rawId}' not found` }));
        return;
      }

      req.tenant = tenant;
      runWithTenant({ tenant, actorId: "admin" }, next);
    } catch (err: unknown) {
      logger.error("Failed to resolve tenant in admin middleware", {
        tenantId: rawId,
        error: String(err),
      });
      next(err);
    }
  };
}
