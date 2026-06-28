// Public surface of @veritas/privacy-api: re-exports bootstrap, config types, and middleware.

export { bootstrap, type BootstrapResult } from "./bootstrap.js";
export { loadConfig, type AppConfig } from "./config.js";
export { buildContainer, type Deps } from "./container.js";
export { buildApp } from "./app.js";
export { buildRouter } from "./router.js";
export { createServer, startServer } from "./server.js";
export { registerShutdownHandlers } from "./shutdown.js";
export { requireAuth, optionalAuth } from "./middleware/auth.js";
export { errorHandler } from "./middleware/error-handler.js";
export { rateLimitMiddleware } from "./middleware/rate-limit.js";
export { loggingMiddleware } from "./middleware/logging.js";
export { metricsMiddleware } from "./middleware/metrics.js";
export { securityHeadersMiddleware } from "./middleware/security-headers.js";
export { paginationMiddleware, type Pagination } from "./middleware/pagination.js";
export { validate } from "./middleware/validate.js";
export { asyncHandler } from "./http/async-handler.js";
export { ApiError } from "./http/api-error.js";
export { sendOk, sendCreated, sendNoContent, sendPage, sendError } from "./http/responder.js";
export { makeProblem, type ProblemDetail } from "./http/problem.js";
