// Public surface of @veritas/admin-api — re-exports all building blocks.

// Bootstrap
export { bootstrap } from "./bootstrap.js";

// App
export { buildApp } from "./app.js";

// Server
export { startServer } from "./server.js";

// Router
export { buildRouter } from "./router.js";

// Container
export { buildContainer } from "./container.js";
export type { Deps } from "./container.js";

// Config
export { loadConfig } from "./config.js";
export type { AppConfig } from "./config.js";

// OpenAPI spec
export { buildOpenApiSpec } from "./openapi.js";
export type { OpenApiSpec } from "./openapi.js";

// HTTP utilities
export { sendOk, sendCreated, sendNoContent, sendPage, sendError } from "./http/responder.js";
export { HttpError } from "./http/api-error.js";
export { asyncHandler } from "./http/async-handler.js";
export { problem } from "./http/problem.js";

// Middleware
export { errorHandler } from "./middleware/error-handler.js";
export { pagination } from "./middleware/pagination.js";
export { requestIdMiddleware } from "./middleware/request-id.js";
export { securityHeadersMiddleware } from "./middleware/security-headers.js";
export { notFoundMiddleware } from "./middleware/not-found.js";

// Context
export { buildContext } from "./context.js";

// Health
export { livenessHandler, buildReadinessHandler } from "./health.js";

// Shutdown
export { registerShutdownHandlers } from "./shutdown.js";

// Errors
export { unwrapResult, toHttpError } from "./errors.js";
