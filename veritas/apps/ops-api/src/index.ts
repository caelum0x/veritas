// Public surface of @veritas/ops-api: re-exports configuration, container, and HTTP utilities.
export { loadConfig, AppConfigSchema } from "./config.js";
export type { AppConfig } from "./config.js";

export { buildContainer } from "./container.js";
export type { Deps } from "./container.js";

export { buildApp } from "./app.js";
export { startServer } from "./server.js";
export { bootstrap } from "./bootstrap.js";
export type { OpsApiInstance } from "./bootstrap.js";

export { buildRouter } from "./router.js";

export { sendOk, sendCreated, sendNoContent, sendPage } from "./http/responder.js";
export { sendApiError } from "./http/api-error.js";
export { asyncHandler } from "./http/async-handler.js";
export { buildProblem, sendProblem } from "./http/problem.js";

export { makeAuthMiddleware } from "./middleware/auth.js";
export { errorHandler } from "./middleware/error-handler.js";
export { makeLoggingMiddleware } from "./middleware/logging.js";
export { makeMetricsMiddleware } from "./middleware/metrics.js";
export { makeRateLimitMiddleware } from "./middleware/rate-limit.js";
export { makeIdempotencyMiddleware } from "./middleware/idempotency.js";
export { requestIdMiddleware } from "./middleware/request-id.js";
export { securityHeadersMiddleware } from "./middleware/security-headers.js";
export { notFoundMiddleware } from "./middleware/not-found.js";
export { paginationMiddleware } from "./middleware/pagination.js";
export type { PaginationParams, PaginatedRequest } from "./middleware/pagination.js";
export { validate, validateQuery, validateParams } from "./middleware/validate.js";

export { httpStatusFor } from "./errors.js";
export type { OpsRequest } from "./context.js";
