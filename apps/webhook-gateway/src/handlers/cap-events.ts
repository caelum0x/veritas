// Handle inbound CAP agent lifecycle webhook events.

import { Logger, noopLogger } from "@veritas/core";
import { WebhookEventType } from "@veritas/webhooks";

export interface CapEventHandler {
  handle(eventType: string, payload: Record<string, unknown>): Promise<void>;
}

export class ConsoleCapEventHandler implements CapEventHandler {
  private readonly logger: Logger;

  constructor(logger: Logger = noopLogger) {
    this.logger = logger;
  }

  async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    switch (eventType) {
      case WebhookEventType.AGENT_REGISTERED:
        this.logger.info("CAP agent registered", {
          agentId: String(payload["agentId"] ?? ""),
          orgId: String(payload["organizationId"] ?? ""),
        });
        break;

      case WebhookEventType.AGENT_DEREGISTERED:
        this.logger.info("CAP agent deregistered", {
          agentId: String(payload["agentId"] ?? ""),
        });
        break;

      case WebhookEventType.JOB_CREATED:
      case WebhookEventType.JOB_STARTED:
      case WebhookEventType.JOB_COMPLETED:
      case WebhookEventType.JOB_FAILED:
        this.logger.info("CAP job event received", {
          eventType,
          jobId: String(payload["jobId"] ?? ""),
          status: String(payload["status"] ?? ""),
        });
        break;

      case WebhookEventType.VERIFICATION_STARTED:
      case WebhookEventType.VERIFICATION_COMPLETED:
      case WebhookEventType.VERIFICATION_FAILED:
        this.logger.info("CAP verification event received", {
          eventType,
          verificationId: String(payload["verificationId"] ?? ""),
        });
        break;

      default:
        this.logger.warn("CAP handler received unrecognised event type", { eventType });
    }
  }
}

export function createCapEventHandler(logger?: Logger): CapEventHandler {
  return new ConsoleCapEventHandler(logger);
}
