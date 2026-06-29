// Dispatch webhook events to subscriber URLs with retry support.

import { Result, ok, err, Logger, noopLogger, newId, epochToIso, IsoTimestamp } from "@veritas/core";
import { WebhookEvent, WebhookSubscription, DeliveryRecord, makeWebhookEvent } from "./event.js";
import { WebhookSigner } from "./signer.js";
import { RetryPolicy, DEFAULT_RETRY_POLICY, shouldRetry, nextRetryAt } from "./retry-policy.js";

export interface DispatchOptions {
  policy?: RetryPolicy;
  logger?: Logger;
  timeoutMs?: number;
}

export interface DispatchResult {
  deliveryId: string;
  success: boolean;
  statusCode: number | null;
  attempt: number;
  error: string | null;
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class WebhookDispatcher {
  private readonly policy: RetryPolicy;
  private readonly logger: Logger;
  private readonly timeoutMs: number;

  constructor(opts: DispatchOptions = {}) {
    this.policy = opts.policy ?? DEFAULT_RETRY_POLICY;
    this.logger = opts.logger ?? noopLogger;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async dispatch(
    subscription: WebhookSubscription,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<Result<DispatchResult, string>> {
    const signer = new WebhookSigner({ secret: subscription.secret });
    const deliveryId = newId("delivery");
    let attempt = 0;

    while (true) {
      attempt += 1;
      const eventId = newId("evt");
      const timestamp = epochToIso(Date.now());

      const event = makeWebhookEvent(
        { type: eventType, subscriptionId: subscription.id, deliveryId, payload, attempt },
        eventId,
        timestamp
      );

      const signed = signer.sign(event as unknown as Record<string, unknown>);

      this.logger.info("Dispatching webhook", {
        deliveryId,
        subscriptionId: subscription.id,
        url: subscription.url,
        attempt: String(attempt),
        eventType,
      });

      try {
        const response = await fetchWithTimeout(
          subscription.url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Veritas-Signature": signed.signatureHeader,
              "X-Veritas-Delivery": deliveryId,
              "X-Veritas-Event": eventType,
            },
            body: signed.body,
          },
          this.timeoutMs
        );

        const success = response.status >= 200 && response.status < 300;

        if (success) {
          this.logger.info("Webhook delivered successfully", {
            deliveryId,
            statusCode: String(response.status),
            attempt: String(attempt),
          });
          return ok({ deliveryId, success: true, statusCode: response.status, attempt, error: null });
        }

        this.logger.warn("Webhook delivery failed with non-2xx status", {
          deliveryId,
          statusCode: String(response.status),
          attempt: String(attempt),
        });

        if (!shouldRetry(attempt, this.policy)) {
          return ok({ deliveryId, success: false, statusCode: response.status, attempt, error: `HTTP ${response.status}` });
        }

        const delay = nextRetryAt(attempt, this.policy) - Date.now();
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, delay)));
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);

        this.logger.error("Webhook delivery threw error", {
          deliveryId,
          attempt: String(attempt),
          error: errorMsg,
        });

        if (!shouldRetry(attempt, this.policy)) {
          return err(`Webhook delivery failed after ${attempt} attempts: ${errorMsg}`);
        }

        const delay = nextRetryAt(attempt, this.policy) - Date.now();
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, delay)));
      }
    }
  }
}

export function createDispatcher(opts?: DispatchOptions): WebhookDispatcher {
  return new WebhookDispatcher(opts);
}
