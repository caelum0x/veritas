// Express middleware that resolves and injects the active tenant into each request
import type { Response, NextFunction } from "express";
import { UnauthorizedError } from "@veritas/core";
import type { TenantStore } from "./tenant-store.js";
import type { TenantRequest, TenantResolutionOptions } from "./types.js";
import { runWithTenant } from "./tenant-context.js";
import { asTenantId } from "./tenant.js";

const DEFAULT_HEADER = "x-tenant-id";

async function resolveTenantId(
  req: TenantRequest,
  opts: TenantResolutionOptions,
): Promise<string | undefined> {
  const { strategy, headerName = DEFAULT_HEADER } = opts;

  switch (strategy) {
    case "header":
      return req.headers[headerName.toLowerCase()] as string | undefined;

    case "host": {
      const host = (req.headers["host"] ?? "").split(":")[0] ?? "";
      // Expect <tenantSlug>.example.com — return the first subdomain segment
      const parts = host.split(".");
      return parts.length >= 3 ? parts[0] : undefined;
    }

    case "principal":
      return req.principal?.tenantId;

    case "path": {
      // Expect /t/<tenantSlug>/... — extract segment after /t/
      const match = /^\/t\/([^/]+)/.exec(req.path);
      return match ? match[1] : undefined;
    }

    default:
      return undefined;
  }
}

/**
 * Creates an Express middleware that resolves the tenant from the request and
 * attaches it to `req.tenant`, also binding it to the AsyncLocalStorage context.
 */
export function tenantMiddleware(
  store: TenantStore,
  opts: Partial<TenantResolutionOptions> = {},
): (req: TenantRequest, res: Response, next: NextFunction) => Promise<void> {
  const options: TenantResolutionOptions = {
    strategy: "header",
    headerName: DEFAULT_HEADER,
    required: true,
    ...opts,
  };

  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = await resolveTenantId(req, options);

      if (!tenantId) {
        if (options.required) {
          next(new UnauthorizedError({ message: "Tenant could not be resolved from the request" }));
          return;
        }
        next();
        return;
      }

      const tenant = await store.findById(asTenantId(tenantId));

      if (!tenant) {
        if (options.required) {
          next(new UnauthorizedError({ message: `Tenant '${tenantId}' not found` }));
          return;
        }
        next();
        return;
      }

      req.tenant = tenant;
      runWithTenant({ tenant, actorId: req.principal?.userId ?? "" }, next);
    } catch (err: unknown) {
      next(err);
    }
  };
}
