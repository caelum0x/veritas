// Public surface of @veritas/reporting-worker — re-exports all module symbols.

export { bootstrap } from "./bootstrap.js";
export type { WorkerContext } from "./bootstrap.js";

export { loadConfig } from "./config.js";
export type { ReportingWorkerConfig } from "./config.js";

export { ScheduleTable } from "./schedule-table.js";
export type { ScheduleEntry } from "./schedule-table.js";

export { InMemoryJobQueue } from "./queue.js";
export type { JobQueue, ReportJob, EnqueueInput, JobState } from "./queue.js";

export { handleNextJob } from "./handler.js";
export type { HandlerDeps, HandleResult } from "./handler.js";

export { generateAndDeliver } from "./generator.js";
export type { GeneratorDeps, GenerateResult } from "./generator.js";

export { runWorkerLoop, DEFAULT_WORKER_CONFIG } from "./worker.js";
export type { WorkerConfig, WorkerState } from "./worker.js";
