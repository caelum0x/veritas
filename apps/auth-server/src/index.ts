// @veritas/auth-server public surface re-exports.

export type { AppConfig, AuthConfig } from "./config.js";
export { loadConfig, loadAuthConfig } from "./config.js";

export type { Deps, TokenService } from "./container.js";
export { buildContainer } from "./container.js";

export { buildApp } from "./app.js";
export { startServer } from "./server.js";
export type { StartedServer } from "./server.js";
export { bootstrap } from "./bootstrap.js";
export type { BootstrapResult } from "./bootstrap.js";
export { registerShutdownHooks } from "./shutdown.js";
