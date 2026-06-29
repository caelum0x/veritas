// Public surface of the @veritas/webhook-gateway package.

export { loadConfig } from "./config.js";
export type { AppConfig } from "./config.js";

export { buildContainer } from "./container.js";
export type { Deps } from "./container.js";

export { buildApp } from "./app.js";
export { buildRouter } from "./router.js";
export { createServer } from "./server.js";
export { bootstrapEventWiring } from "./bootstrap.js";
export { registerShutdownHandlers } from "./shutdown.js";
export { createHealthHandler } from "./health.js";

export { openApiSpec } from "./openapi.js";

// Errors
export {
  ReplayDetectedError,
  UnknownSourceError,
  MissingHeaderError,
  SignatureVerificationError,
  PayloadParseError,
  HandlerError,
  IdempotencyConflictError,
  RateLimitExceededError,
} from "./errors.js";

// HTTP helpers
export { ApiError } from "./http/api-error.js";
export { sendOk, sendCreated, sendNoContent, sendPaginated, sendError } from "./http/responder.js";
export { asyncHandler } from "./http/async-handler.js";
export { toProblemDetail } from "./http/problem.js";

// Middleware
export { authMiddleware, requireScope } from "./middleware/auth.js";
export { errorHandlerMiddleware } from "./middleware/error-handler.js";
export { rateLimitMiddleware } from "./middleware/rate-limit.js";
export { idempotencyMiddleware } from "./middleware/idempotency.js";
export { validateBody, validateQuery } from "./middleware/validate.js";
export { requestIdMiddleware } from "./middleware/request-id.js";
export { loggingMiddleware } from "./middleware/logging.js";
export { metricsMiddleware } from "./middleware/metrics.js";
export { securityHeadersMiddleware } from "./middleware/security-headers.js";
export { notFoundMiddleware } from "./middleware/not-found.js";
export { paginationMiddleware } from "./middleware/pagination.js";
export type { Pagination } from "./middleware/pagination.js";
