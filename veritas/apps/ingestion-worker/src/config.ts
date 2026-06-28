// Ingestion-worker configuration: reads and validates worker-specific env vars.

import { z } from "zod";

const WorkerConfigSchema = z.object({
  /** Number of jobs processed concurrently. */
  concurrency: z.number().int().positive().default(4),
  /** Milliseconds between poll cycles when queue is empty. */
  pollIntervalMs: z.number().int().positive().default(2_000),
  /** Maximum bytes per ingested document before rejection. */
  maxDocumentBytes: z.number().int().positive().default(10 * 1024 * 1024),
  /** Target chunk size in characters. */
  chunkSize: z.number().int().positive().default(1_000),
  /** Chunk overlap in characters. */
  chunkOverlap: z.number().int().min(0).default(100),
  /** Whether to forward extracted claims to verification. */
  verificationEnabled: z.boolean().default(true),
});

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;

export function loadWorkerConfig(): WorkerConfig {
  const raw = {
    concurrency: process.env["WORKER_CONCURRENCY"] != null
      ? Number(process.env["WORKER_CONCURRENCY"])
      : undefined,
    pollIntervalMs: process.env["WORKER_POLL_INTERVAL_MS"] != null
      ? Number(process.env["WORKER_POLL_INTERVAL_MS"])
      : undefined,
    maxDocumentBytes: process.env["WORKER_MAX_DOCUMENT_BYTES"] != null
      ? Number(process.env["WORKER_MAX_DOCUMENT_BYTES"])
      : undefined,
    chunkSize: process.env["WORKER_CHUNK_SIZE"] != null
      ? Number(process.env["WORKER_CHUNK_SIZE"])
      : undefined,
    chunkOverlap: process.env["WORKER_CHUNK_OVERLAP"] != null
      ? Number(process.env["WORKER_CHUNK_OVERLAP"])
      : undefined,
    verificationEnabled: process.env["WORKER_VERIFICATION_ENABLED"] != null
      ? process.env["WORKER_VERIFICATION_ENABLED"] !== "false"
      : undefined,
  };

  const result = WorkerConfigSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Worker configuration invalid:\n${messages}`);
  }
  return result.data;
}
