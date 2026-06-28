// Public surface of @veritas/analytics-api — re-exports core types and factory functions.
export type { Deps } from "./container.js";
export { buildContainer } from "./container.js";
export type { AnalyticsApiConfig } from "./config.js";
export { loadConfig, AnalyticsApiConfigSchema } from "./config.js";
export { buildApp } from "./app.js";
export { buildRouter } from "./router.js";
export { startServer } from "./server.js";
export { registerShutdownHandlers } from "./shutdown.js";
export type { DashboardStore, LocalDashboard } from "./bootstrap.js";
export { buildDashboardStore } from "./bootstrap.js";
export { errorHandler } from "./middleware/error-handler.js";
export { makeAuthMiddleware, requireScope } from "./middleware/auth.js";
