// webhook-bridge.ts: dispatches domain events to registered webhook subscriptions.

import type { DomainEvent, Logger, Result } from "@veritas/core";
import { ok, err, noopLogger, epochToIso, newId } from "@veritas/core";
import type { WebhookSubscription } from "@veritas/webhooks";
import { WebhookRegistry, makeWebhookEvent, WebhookSigner } from "@veritas/webhooks";
import { isWebhookEventType } from "@veritas/webhooks";

export interface WebhookDispatcher {
  dispatch(
    subscription: WebhookSubscription,
    body: string,
    signatureHeader: string,
  ): Promise<{ statusCode: number; success: boolean; responseBody: string | null; error: string | null }>;
}

export interface WebhookBridgeOptions {
  readonly registry: WebhookRegistry;
  readonly dispatcher: WebhookDispatcher;
  readonly signerSecret: string;
  readonly organizationId: string;
  readonly logger?: Logger;
}

export interface WebhookBridgeResult {
  readonly dispatched: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

/**
 * WebhookBridge handles a domain event by finding active webhook subscriptions
 * for the event type and dispatching signed payloads to each endpoint.
 */
export class WebhookBridge {
  private readonly registry: WebhookRegistry;
  private readonly dispatcher: WebhookDispatcher;
  private readonly signer: WebhookSigner;
  private readonly organizationId: string;
  private readonly logger: Logger;

  constructor(options: WebhookBridgeOptions) {
    this.registry = options.registry;
    this.dispatcher = options.dispatcher;
    this.signer = new WebhookSigner({ secret: options.signerSecret });
    this.organizationId = options.organizationId;
    this.logger = options.logger ?? noopLogger;
  }

  async handle(event: DomainEvent): Promise<Result<WebhookBridgeResult, Error>> {
    const eventType = event.type;

    if (!isWebhookEventType(eventType)) {
      return ok({ dispatched: 0, skipped: 1, errors: [] });
    }

    let subscriptions: WebhookSubscription[];
    try {
      subscriptions = await this.registry.findActiveForEventType(this.organizationId, eventType);
    } catch (e) {
      const msg = `WebhookBridge: failed to find subscriptions for ${eventType}: ${String(e)}`;
      this.logger.error(msg);
      return err(new Error(msg));
    }

    if (subscriptions.length === 0) {
      return ok({ dispatched: 0, skipped: 0, errors: [] });
    }

    const errors: string[] = [];
    let dispatched = 0;

    for (const sub of subscriptions) {
      const eventId = newId("whevt");
      const deliveryId = newId("whdlv");
      const timestamp = epochToIso(Date.now());

      const webhookEvent = makeWebhookEvent(
        {
          type: eventType,
          subscriptionId: sub.id,
          deliveryId,
          payload: event as unknown as Record<string, unknown>,
        },
        eventId,
        timestamp,
      );

      const { body, signatureHeader } = this.signer.sign(
        webhookEvent as unknown as Record<string, unknown>,
      );

      try {
        const result = await this.dispatcher.dispatch(sub, body, signatureHeader);
        if (result.success) {
          dispatched++;
          this.logger.debug("Webhook dispatched", {
            eventType,
            subscriptionId: sub.id,
            deliveryId,
            statusCode: result.statusCode,
          });
        } else {
          const msg = `Webhook delivery failed for subscription ${sub.id}: ${result.error ?? "unknown"}`;
          errors.push(msg);
          this.logger.warn(msg, { subscriptionId: sub.id, eventType });
        }
      } catch (e) {
        const msg = `Webhook dispatch threw for subscription ${sub.id}: ${String(e)}`;
        errors.push(msg);
        this.logger.error(msg, { subscriptionId: sub.id, eventType });
      }
    }

    return ok({ dispatched, skipped: 0, errors });
  }
}
