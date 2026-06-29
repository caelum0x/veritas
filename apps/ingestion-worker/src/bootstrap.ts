// bootstrap: wires config, queue, pipeline, job store, and worker for the ingestion worker process.

import { noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";
import {
  IngestionPipeline,
  InMemoryJobStore,
  MockFetcher,
  MockLanguageDetector,
} from "@veritas/ingestion";
import { loadWorkerConfig } from "./config.js";
import type { WorkerConfig } from "./config.js";
import { InMemoryJobQueue } from "./queue.js";
import type { JobQueue } from "./queue.js";
import { createWorker } from "./worker.js";
import type { Worker } from "./worker.js";

export interface WorkerDeps {
  readonly queue: JobQueue;
  readonly pipeline: IngestionPipeline;
  readonly jobStore: InMemoryJobStore;
  readonly config: WorkerConfig;
  readonly worker: Worker;
}

/** Assemble all worker dependencies from environment configuration. */
export function bootstrap(logger: Logger = noopLogger): WorkerDeps {
  const config = loadWorkerConfig();

  const queue = new InMemoryJobQueue();

  const pipeline = new IngestionPipeline({
    fetcher: new MockFetcher(),
    languageDetector: new MockLanguageDetector(),
  });

  const jobStore = new InMemoryJobStore();

  const worker = createWorker({
    queue,
    pipeline,
    jobStore,
    logger,
    config,
  });

  return { queue, pipeline, jobStore, config, worker };
}
