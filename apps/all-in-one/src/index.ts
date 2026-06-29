// Public surface of @veritas/all-in-one — re-exports run helpers and dev config.

export { run } from "./run.js";
export type { RunOptions, RunHandle } from "./run.js";

export { buildDevConfig } from "./config.js";

export { seedDemoData, DEMO_SOURCES, DEMO_CLAIMS } from "./seed.js";
export type { SeedDeps, SeedResult } from "./seed.js";
