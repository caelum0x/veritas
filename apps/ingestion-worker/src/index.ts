// @veritas/ingestion-worker: public surface re-exporting all worker modules.

export { loadWorkerConfig } from "./config.js";
export type { WorkerConfig } from "./config.js";

export { InMemoryJobQueue } from "./queue.js";
export type { JobQueue, QueuedJob } from "./queue.js";

export { bootstrap } from "./bootstrap.js";
export type { WorkerDeps } from "./bootstrap.js";

export { createWorker } from "./worker.js";
export type { Worker } from "./worker.js";

export { handleJob } from "./handler.js";
export type { HandlerDeps, HandlerResult } from "./handler.js";

export { runPipeline } from "./pipeline-runner.js";
export type { PipelineRunnerDeps, PipelineRunResult } from "./pipeline-runner.js";

export { dispatchToVerification } from "./to-verification.js";
export type { ToVerificationOptions, VerificationDispatchResult } from "./to-verification.js";
