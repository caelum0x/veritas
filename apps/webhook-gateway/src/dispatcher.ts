// Route parsed webhook events to domain-specific handlers.

import { Logger, noopLogger } from "@veritas/core";
import { WebhookEventType, isWebhookEventType } from "@veritas/webhooks";
import type { CapEventHandler } from "./handlers/cap-events.js";
import type { PaymentEventHandler } from "./handlers/payment-events.js";
import { HandlerError } from "./errors.js";

const CAP_EVENT_TYPES = new Set<string>([
  WebhookEventType.AGENT_REGISTERED,
  WebhookEventType.AGENT_DEREGISTERED,
  WebhookEventType.JOB_CREATED,
  WebhookEventType.JOB_STARTED,
  WebhookEventType.JOB_COMPLETED,
  WebhookEventType.JOB_FAILED,
  WebhookEventType.VERIFICATION_STARTED,
  WebhookEventType.VERIFICATION_COMPLETED,
  WebhookEventType.VERIFICATION_FAILED,
  WebhookEventType.CLAIM_CREATED,
  WebhookEventType.CLAIM_UPDATED,
  WebhookEventType.CLAIM_DELETED,
]);

const PAYMENT_EVENT_TYPES = new Set<string>([
  WebhookEventType.ORDER_CREATED,
  WebhookEventType.ORDER_SETTLED,
  WebhookEventType.ORDER_CANCELLED,
  WebhookEventType.SETTLEMENT_INITIATED,
  WebhookEventType.SETTLEMENT_CONFIRMED,
  WebhookEventType.SETTLEMENT_FAILED,
  WebhookEventType.INVOICE_CREATED,
  WebhookEventType.INVOICE_PAID,
  WebhookEventType.USAGE_THRESHOLD_REACHED,
]);

export interface EventDispatcherDeps {
  capHandler: CapEventHandler;
  paymentHandler: PaymentEventHandler;
  logger?: Logger;
}

export class EventDispatcher {
  private readonly capHandler: CapEventHandler;
  private readonly paymentHandler: PaymentEventHandler;
  private readonly logger: Logger;

  constructor(deps: EventDispatcherDeps) {
    this.capHandler = deps.capHandler;
    this.paymentHandler = deps.paymentHandler;
    this.logger = deps.logger ?? noopLogger;
  }

  async dispatch(eventType: string, payload: Record<string, unknown>): Promise<void> {
    this.logger.info("Dispatching event to handler", { eventType });

    try {
      if (CAP_EVENT_TYPES.has(eventType)) {
        await this.capHandler.handle(eventType, payload);
      } else if (PAYMENT_EVENT_TYPES.has(eventType)) {
        await this.paymentHandler.handle(eventType, payload);
      } else {
        this.logger.warn("No handler registered for event type", { eventType });
      }
    } catch (cause: unknown) {
      throw new HandlerError(eventType, cause);
    }
  }
}
