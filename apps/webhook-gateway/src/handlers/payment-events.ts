// Handle inbound payment and settlement webhook events.

import { Logger, noopLogger } from "@veritas/core";
import { WebhookEventType } from "@veritas/webhooks";

export interface PaymentEventHandler {
  handle(eventType: string, payload: Record<string, unknown>): Promise<void>;
}

export class ConsolePaymentEventHandler implements PaymentEventHandler {
  private readonly logger: Logger;

  constructor(logger: Logger = noopLogger) {
    this.logger = logger;
  }

  async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    switch (eventType) {
      case WebhookEventType.ORDER_CREATED:
      case WebhookEventType.ORDER_SETTLED:
      case WebhookEventType.ORDER_CANCELLED:
        this.logger.info("Payment order event received", {
          eventType,
          orderId: String(payload["orderId"] ?? ""),
          status: String(payload["status"] ?? ""),
        });
        break;

      case WebhookEventType.SETTLEMENT_INITIATED:
      case WebhookEventType.SETTLEMENT_CONFIRMED:
      case WebhookEventType.SETTLEMENT_FAILED:
        this.logger.info("Settlement event received", {
          eventType,
          settlementId: String(payload["settlementId"] ?? ""),
        });
        break;

      case WebhookEventType.INVOICE_CREATED:
      case WebhookEventType.INVOICE_PAID:
        this.logger.info("Invoice event received", {
          eventType,
          invoiceId: String(payload["invoiceId"] ?? ""),
        });
        break;

      case WebhookEventType.USAGE_THRESHOLD_REACHED:
        this.logger.warn("Usage threshold reached", {
          orgId: String(payload["organizationId"] ?? ""),
          threshold: String(payload["threshold"] ?? ""),
        });
        break;

      default:
        this.logger.warn("Payment handler received unrecognised event type", { eventType });
    }
  }
}

export function createPaymentEventHandler(logger?: Logger): PaymentEventHandler {
  return new ConsolePaymentEventHandler(logger);
}
