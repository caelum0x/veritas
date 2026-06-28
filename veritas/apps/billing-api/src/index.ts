// Public surface of @veritas/billing-api: exports app assembly and config.

export { loadConfig } from "./config.js";
export type { AppConfig } from "./config.js";

export { buildContainer } from "./container.js";
export type { Deps, Deps as AppDeps } from "./container.js";

export { buildApp } from "./app.js";
export { buildRouter } from "./router.js";
export { startServer } from "./server.js";
export { bootstrap, startBootstrapped } from "./bootstrap.js";

export { handleLiveness, makeReadinessHandler } from "./health.js";
export { registerShutdownHandlers } from "./shutdown.js";

export { OPENAPI_SPEC } from "./openapi.js";

export { apiKeyAuthMiddleware, sessionAuth, getPrincipal, requirePrincipal } from "./middleware/auth.js";
export { makeErrorHandler } from "./middleware/error-handler.js";
export { rateLimitMiddleware } from "./middleware/rate-limit.js";
export { idempotencyMiddleware } from "./middleware/idempotency.js";
export { requestIdMiddleware } from "./middleware/request-id.js";
export { loggingMiddleware } from "./middleware/logging.js";
export { metricsMiddleware } from "./middleware/metrics.js";
export { securityHeadersMiddleware } from "./middleware/security-headers.js";
export { notFoundMiddleware } from "./middleware/not-found.js";
export { paginationMiddleware, getPagination } from "./middleware/pagination.js";
export { validateBody, validateParams, validateQuery } from "./middleware/validate.js";

export { asyncHandler } from "./http/async-handler.js";
export { ApiError, isApiError } from "./http/api-error.js";
export { respondOk, respondCreated, respondNoContent, respondPaginated, respondError } from "./http/responder.js";
export { buildProblem } from "./http/problem.js";

export {
  BillingApiError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitedError,
  isBillingApiError,
  httpStatusForCode,
} from "./errors.js";

export {
  setRequestContext,
  getRequestContext,
  requireRequestContext,
  requireOrganizationId,
} from "./context.js";
