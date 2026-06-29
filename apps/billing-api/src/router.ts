// Mounts all feature route groups onto the Express v1 router.

import { Router } from "express";
import type { Deps } from "./container.js";
import { registerSubscriptionsRoutes } from "./features/subscriptions/subscriptions.routes.js";
import { registerInvoicesRoutes } from "./features/invoices/invoices.routes.js";
import { registerUsageRoutes } from "./features/usage/usage.routes.js";
import { registerPaymentsRoutes } from "./features/payments/payments.routes.js";
import { registerTaxRoutes } from "./features/tax/tax.routes.js";

export function buildRouter(deps: Deps): Router {
  const router = Router();

  registerSubscriptionsRoutes(router, deps);
  registerInvoicesRoutes(router, deps);
  registerUsageRoutes(router, deps);
  registerPaymentsRoutes(router, deps);
  registerTaxRoutes(router, deps);

  return router;
}
