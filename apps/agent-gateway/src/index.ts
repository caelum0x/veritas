// Public surface of the @veritas/agent-gateway package.

export { loadConfig, type AppConfig } from "./config.js";
export { buildContainer, type Deps } from "./container.js";
export { buildApp } from "./app.js";
export { startServer, type ServerStartResult } from "./server.js";
export { bootstrap, type BootstrapResult } from "./bootstrap.js";
export { registerShutdownHandlers } from "./shutdown.js";
export { buildRouter } from "./router.js";
export { healthHandler, livenessHandler, readinessHandler } from "./health.js";
export { contextFromRequest, runWithGatewayContext, getGatewayContext } from "./context.js";
export * from "./errors.js";
