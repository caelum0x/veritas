// Wires all reporting-worker dependencies and returns the ready-to-run worker.

import { createLogger } from "@veritas/observability";
import { InMemoryReportStore, InMemoryReportTemplateStore } from "@veritas/reporting";
import { loadConfig } from "./config.js";
import type { ReportingWorkerConfig } from "./config.js";
import { InMemoryJobQueue } from "./queue.js";
import type { HandlerDeps } from "./handler.js";
import { DEFAULT_WORKER_CONFIG, runWorkerLoop } from "./worker.js";
import type { WorkerConfig, WorkerState } from "./worker.js";

/** Assembled application context returned from bootstrap. */
export interface WorkerContext {
  readonly deps: HandlerDeps;
  readonly config: ReportingWorkerConfig;
  readonly workerConfig: WorkerConfig;
  readonly signal: { running: boolean };
  /** Start the worker loop; resolves when the loop exits. */
  start(): Promise<WorkerState>;
  /** Signal the worker loop to stop. */
  stop(): void;
}

/** Instantiate and wire all components; returns a ready-to-start WorkerContext. */
export function bootstrap(): WorkerContext {
  const config = loadConfig();

  const logger = createLogger({
    level: config.logLevel,
    bindings: { service: "reporting-worker", env: config.nodeEnv },
  });

  // Port interface implementations (in-memory for dev/test; swap for DB-backed in prod)
  const reportStore = new InMemoryReportStore();
  const templateStore = new InMemoryReportTemplateStore();
  const queue = new InMemoryJobQueue();

  const deps: HandlerDeps = { reportStore, templateStore, queue, logger };

  const workerConfig: WorkerConfig = {
    ...DEFAULT_WORKER_CONFIG,
    pollIntervalMs: config.pollIntervalMs,
    maxConsecutiveErrors: config.maxRetries,
  };

  const signal = { running: false };

  return {
    deps,
    config,
    workerConfig,
    signal,
    start() {
      signal.running = true;
      return runWorkerLoop(deps, workerConfig, signal);
    },
    stop() {
      signal.running = false;
    },
  };
}
