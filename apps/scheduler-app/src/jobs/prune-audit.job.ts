// Scheduled job: delete audit log entries older than the configured retention window.
import { type JobHandler, type JobExecutionContext } from "@veritas/scheduler";
import { type Logger, noopLogger, epochToIso } from "@veritas/core";
import { z } from "zod";

const PruneAuditPayloadSchema = z.object({
  /** Retain audit log entries younger than this many milliseconds. Default: 90 days. */
  retentionMs: z.number().int().positive().optional(),
  /** Maximum rows to delete in one pass to avoid long table locks. */
  batchSize: z.number().int().positive().max(10_000).optional(),
});

export interface AuditPrunePort {
  /** Delete entries created before the given ISO timestamp. Returns the count deleted. */
  deleteOlderThan(cutoff: string, batchSize: number): Promise<{ deleted: number }>;
}

const DEFAULT_RETENTION_MS = 90 * 24 * 3_600_000; // 90 days

/** Returns a JobHandler that prunes stale audit log entries. */
export function makePruneAuditHandler(
  auditLog: AuditPrunePort,
  logger: Logger = noopLogger,
): JobHandler {
  return async (ctx: JobExecutionContext): Promise<void> => {
    const parsed = PruneAuditPayloadSchema.safeParse(ctx.payload);
    if (!parsed.success) {
      throw new Error(
        `Invalid prune-audit payload: ${parsed.error.errors.map((e) => e.message).join("; ")}`,
      );
    }

    const retentionMs = parsed.data.retentionMs ?? DEFAULT_RETENTION_MS;
    const batchSize = parsed.data.batchSize ?? 1_000;
    const cutoff = epochToIso(Date.now() - retentionMs);

    logger.info("prune-audit: starting deletion", { cutoff, batchSize, jobId: ctx.jobId });

    const { deleted } = await auditLog.deleteOlderThan(cutoff, batchSize);

    logger.info("prune-audit: complete", { deleted, jobId: ctx.jobId });
  };
}
