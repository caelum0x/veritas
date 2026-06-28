// Public barrel export for @veritas/growth-api library surface.
export { loadConfig, type AppConfig } from "./config.js";
export { buildContainer, type Deps } from "./container.js";
export { buildApp } from "./app.js";
export { startServer } from "./server.js";
export { bootstrap, type BootstrapResult } from "./bootstrap.js";
export { registerShutdownHandlers } from "./shutdown.js";
export { buildRouter } from "./router.js";
export { makeAuthMiddleware, getPrincipal } from "./middleware/auth.js";
export { buildErrorHandler } from "./middleware/error-handler.js";
