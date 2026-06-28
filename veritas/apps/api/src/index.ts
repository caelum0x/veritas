// Public re-exports for the @veritas/api package.
export { buildApp } from "./app.js";
export { buildRouter } from "./router.js";
export { createServer, startServer, stopServer } from "./server.js";
export { buildDeps } from "./container.js";
export type { Deps } from "./container.js";
export { bootstrap } from "./bootstrap.js";

// HTTP helpers
export { respondOk, respondCreated, respondNoContent, respondPage, respondError } from "./http/responder.js";
export { buildProblem, sendProblem } from "./http/problem.js";
export { asyncHandler } from "./http/async-handler.js";
export { HttpApiError, toHttpError, isHttpApiError } from "./http/api-error.js";

// Middleware factories
export { requestIdMiddleware } from "./middleware/request-id.js";
export { loggingMiddleware } from "./middleware/logging.js";
export { errorHandler } from "./middleware/error-handler.js";
export { notFoundHandler } from "./middleware/not-found.js";
export type { AuthenticatedRequest, ApiKeyAuthService } from "./middleware/auth.js";
export { createAuthMiddleware, requireScope, optionalAuth } from "./middleware/auth.js";
export { createRateLimitMiddleware, InMemoryRateLimitStore } from "./middleware/rate-limit.js";
export { createIdempotencyMiddleware, InMemoryIdempotencyStore } from "./middleware/idempotency.js";
export { validateBody, validateQuery, validateParams, validate } from "./middleware/validate.js";
export { pagination } from "./middleware/pagination.js";
