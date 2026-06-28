// Re-exports for the @veritas/cap-agent package public surface.
export { main } from "./main.js";
export { bootstrap } from "./bootstrap.js";
export { getAgentHealth, isAgentHealthy } from "./health.js";
export { attachShutdownHandlers } from "./shutdown.js";
export { runSupervisor } from "./runtime.js";
