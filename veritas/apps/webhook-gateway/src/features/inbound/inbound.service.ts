// Service: verifies inbound webhook signatures, enforces replay protection, and dispatches events.

import { verifySignature } from "@veritas/webhooks";
import { isWebhookEventType } from "@veritas/webhooks";
import { WebhookBridge } from "@veritas/event-wiring";
import type { Deps } from "../../container.js";
import type { InboundSource } from "./inbound.schema.js";
import { ApiError } from "../../http/api-error.js";

export interface ReceiveWebhookInput {
  readonly source: InboundSource;
  readonly deliveryId: string;
  readonly eventType: string;
  readonly signatureHeader: string;
  readonly rawBody: string;
  readonly payload: Record<string, unknown>;
}

export interface ReceiveWebhookOutput {
  readonly accepted: true;
  readonly deliveryId: string;
  readonly eventType: string;
}

/** Selects the correct HMAC secret for each inbound source. */
function resolveSecret(source: InboundSource, deps: Deps): string {
  switch (source) {
    case "cap":
      return deps.config.webhookSigningSecret;
    case "payment":
      return deps.config.webhookSigningSecret;
  }
}

export class InboundService {
  private readonly replaySeen = new Map<string, number>();
  private readonly replayWindowMs: number;

  constructor(private readonly deps: Deps) {
    this.replayWindowMs = deps.config.signatureMaxAgeMs;
  }

  async receive(input: ReceiveWebhookInput): Promise<ReceiveWebhookOutput> {
    const { source, deliveryId, eventType, signatureHeader, rawBody, payload } = input;
    const log = this.deps.logger;

    // Signature verification via @veritas/webhooks
    const secret = resolveSecret(source, this.deps);
    const verifyResult = this.deps.webhookVerifier.verify({
      signatureHeader,
      body: rawBody,
      secret,
    });
    if (!verifyResult.ok) {
      log.warn("Inbound signature invalid", { deliveryId, source, reason: verifyResult.error });
      throw ApiError.unauthorized(`Webhook signature invalid: ${verifyResult.error}`);
    }

    // Replay protection — in-memory TTL
    this.evictExpired();
    if (this.replaySeen.has(deliveryId)) {
      log.warn("Duplicate delivery rejected", { deliveryId, eventType });
      throw new ApiError(409, "DUPLICATE_DELIVERY", `Duplicate delivery: ${deliveryId}`);
    }
    this.replaySeen.set(deliveryId, Date.now() + this.replayWindowMs);

    // Route to webhook bridge if this is a recognised event type
    if (isWebhookEventType(eventType)) {
      const domainEvent = {
        type: eventType,
        payload,
        id: deliveryId,
        occurredAt: new Date().toISOString(),
        ...payload,
      } as unknown as Parameters<InstanceType<typeof WebhookBridge>["handle"]>[0];

      const bridge = new WebhookBridge({
        registry: this.deps.webhookRegistry,
        dispatcher: {
          async dispatch(_sub, body, signatureHeader) {
            // Forward to registered subscribers via HTTP fetch
            try {
              const response = await fetch(_sub.url, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-veritas-signature": signatureHeader,
                  "x-veritas-delivery": deliveryId,
                  "x-veritas-event": eventType,
                },
                body,
              });
              const responseBody = await response.text().catch(() => null);
              return {
                statusCode: response.status,
                success: response.ok,
                responseBody,
                error: response.ok ? null : `HTTP ${response.status}`,
              };
            } catch (e) {
              return {
                statusCode: null,
                success: false,
                responseBody: null,
                error: e instanceof Error ? e.message : String(e),
              };
            }
          },
        },
        signerSecret: this.deps.config.webhookSigningSecret,
        organizationId: this.deps.config.defaultOrganizationId,
        logger: log,
      });

      const bridgeResult = await bridge.handle(domainEvent);
      if (!bridgeResult.ok) {
        log.error("WebhookBridge dispatch error", {
          deliveryId,
          eventType,
          error: bridgeResult.error?.message,
        });
      } else {
        log.info("Inbound event dispatched via bridge", {
          deliveryId,
          eventType,
          dispatched: String(bridgeResult.value.dispatched),
          errors: String(bridgeResult.value.errors.length),
        });
      }
    } else {
      log.info("Inbound event accepted (no bridge match)", { deliveryId, eventType });
    }

    return { accepted: true, deliveryId, eventType };
  }

  private evictExpired(): void {
    if (this.replaySeen.size < 10_000) return;
    const now = Date.now();
    for (const [id, exp] of this.replaySeen) {
      if (now > exp) this.replaySeen.delete(id);
    }
  }
}
