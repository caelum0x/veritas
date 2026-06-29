// Scheduled job: retry failed webhook deliveries that are eligible for re-dispatch.
import { type JobHandler, type JobExecutionContext } from "@veritas/scheduler";
import { type Logger, noopLogger, epochToIso } from "@veritas/core";
import { z } from "zod";

const RetryWebhooksPayloadSchema = z.object({
  /** Maximum deliveries to retry per run. */
  batchSize: z.number().int().positive().max(500).optional(),
  /** Retry deliveries that failed within the last N milliseconds. */
  windowMs: z.number().int().positive().optional(),
});

export interface FailedDelivery {
  readonly id: string;
  readonly webhookId: string;
  readonly attemptCount: number;
}

export interface WebhookRetryPort {
  listRetryable(since: string, limit: number): Promise<FailedDelivery[]>;
  retryDelivery(deliveryId: string): Promise<{ success: boolean; statusCode?: number }>;
}

/** Returns a JobHandler that scans for failed webhook deliveries and re-dispatches them. */
export function makeRetryWebhooksHandler(
  webhooks: WebhookRetryPort,
  logger: Logger = noopLogger,
): JobHandler {
  return async (ctx: JobExecutionContext): Promise<void> => {
    const parsed = RetryWebhooksPayloadSchema.safeParse(ctx.payload);
    if (!parsed.success) {
      throw new Error(
        `Invalid retry-webhooks payload: ${parsed.error.errors.map((e) => e.message).join("; ")}`,
      );
    }

    const { batchSize = 100, windowMs = 6 * 3_600_000 } = parsed.data;
    const since = epochToIso(Date.now() - windowMs);

    logger.info("retry-webhooks: scanning failed deliveries", { since, batchSize, jobId: ctx.jobId });

    const deliveries = await webhooks.listRetryable(since, batchSize);
    logger.info("retry-webhooks: found retryable deliveries", { count: deliveries.length, jobId: ctx.jobId });

    let retried = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      const result = await webhooks.retryDelivery(delivery.id);
      if (result.success) {
        retried++;
        logger.info("retry-webhooks: delivery succeeded", {
          deliveryId: delivery.id,
          webhookId: delivery.webhookId,
          statusCode: result.statusCode,
        });
      } else {
        failed++;
        logger.warn("retry-webhooks: delivery still failing", {
          deliveryId: delivery.id,
          webhookId: delivery.webhookId,
          attemptCount: delivery.attemptCount + 1,
        });
      }
    }

    logger.info("retry-webhooks: complete", { jobId: ctx.jobId, retried, failed });

    if (failed > 0 && failed === deliveries.length && deliveries.length > 0) {
      throw new Error(`All ${failed} webhook retry attempts failed`);
    }
  };
}
