// Handler for deliver-webhook jobs: POSTs event payloads to registered webhook endpoints.
import { z } from "zod";
import { Result, ok, err, ValidationError, InternalError, Logger, noopLogger } from "@veritas/core";
import { Job } from "../queue/job.js";
import { JobHandler } from "../handler.js";

const DeliverWebhookPayloadSchema = z.object({
  webhookId: z.string().min(1),
  deliveryId: z.string().min(1),
  endpointUrl: z.string().url(),
  secret: z.string().min(1),
  event: z.object({
    type: z.string().min(1),
    occurredAt: z.string().min(1),
    data: z.unknown(),
  }),
});

export type DeliverWebhookPayload = z.infer<typeof DeliverWebhookPayloadSchema>;

export interface WebhookDeliveryService {
  deliver(
    webhookId: string,
    deliveryId: string,
    endpointUrl: string,
    secret: string,
    event: DeliverWebhookPayload["event"]
  ): Promise<Result<{ statusCode: number }>>;
}

export class DeliverWebhookHandler implements JobHandler<DeliverWebhookPayload> {
  constructor(
    private readonly deliveryService: WebhookDeliveryService,
    private readonly logger: Logger = noopLogger
  ) {}

  async handle(job: Job<DeliverWebhookPayload>): Promise<Result<void>> {
    const parsed = DeliverWebhookPayloadSchema.safeParse(job.payload);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return err(new ValidationError({ message: `Invalid deliver-webhook payload: ${msg}` }));
    }

    const { webhookId, deliveryId, endpointUrl, secret, event } = parsed.data;
    this.logger.info("deliver-webhook: attempting delivery", {
      webhookId,
      deliveryId,
      eventType: event.type,
      jobId: job.id,
    });

    const result = await this.deliveryService.deliver(
      webhookId,
      deliveryId,
      endpointUrl,
      secret,
      event
    );

    if (!result.ok) {
      const delivErrMsg = result.error instanceof Error ? result.error.message : String(result.error);
      this.logger.error("deliver-webhook: delivery failed", {
        webhookId,
        deliveryId,
        jobId: job.id,
        error: delivErrMsg,
      });
      return err(new InternalError({ message: `Webhook delivery failed: ${delivErrMsg}` }));
    }

    const { statusCode } = result.value;
    if (statusCode < 200 || statusCode >= 300) {
      const msg = `Endpoint returned non-2xx status: ${statusCode}`;
      this.logger.warn("deliver-webhook: non-success response", { webhookId, deliveryId, statusCode });
      return err(new InternalError({ message: msg }));
    }

    this.logger.info("deliver-webhook: delivered successfully", {
      webhookId,
      deliveryId,
      statusCode,
      jobId: job.id,
    });

    return ok(undefined);
  }
}
