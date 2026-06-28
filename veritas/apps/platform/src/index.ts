// Public surface of @veritas/platform — re-exports all platform modules.

export { getPlatformConfig } from "./config.js";
export type { AppConfig } from "./config.js";

export { buildHealthRouter } from "./health.js";
export type { HealthRouterOptions } from "./health.js";

export { registerShutdown } from "./shutdown.js";
export type { ShutdownOptions } from "./shutdown.js";

export { createRuntimeSupervisor } from "./runtime.js";
export type { RuntimeComponent, RuntimeSupervisor } from "./runtime.js";
