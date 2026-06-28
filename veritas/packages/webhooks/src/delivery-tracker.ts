// Tracks webhook delivery attempts, updating status and scheduling retries.

import { epochToIso, IsoTimestamp, newId, Result, ok, err } from "@veritas/core";
import { DeliveryRecord, WebhookSubscription } from "./event.js";
import { WebhookRetryExhaustedError } from "./errors.js";
import { computeRetryDelayMs, RetryPolicy } from "./retry-policy.js";

export interface DeliveryAttemptResult {
  statusCode: number | null;
  success: boolean;
  responseBody: string | null;
  error: string | null;
}

export interface DeliveryStore {
  save(record: DeliveryRecord): Promise<void>;
  findById(id: string): Promise<DeliveryRecord | null>;
  findBySubscriptionId(subscriptionId: string, limit?: number): Promise<DeliveryRecord[]>;
  update(id: string, patch: Partial<DeliveryRecord>): Promise<void>;
}

export class DeliveryTracker {
  constructor(
    private readonly store: DeliveryStore,
    private readonly policy: RetryPolicy,
  ) {}

  async initDelivery(subscription: WebhookSubscription, eventId: string, eventType: string): Promise<DeliveryRecord> {
    const now = epochToIso(Date.now());
    const record: DeliveryRecord = {
      id: newId("delivery"),
      subscriptionId: subscription.id,
      eventId,
      eventType,
      attempt: 0,
      statusCode: null,
      success: false,
      responseBody: null,
      error: null,
      deliveredAt: null,
      nextRetryAt: now,
      createdAt: now,
    };
    await this.store.save(record);
    return record;
  }

  async recordAttempt(
    record: DeliveryRecord,
    result: DeliveryAttemptResult,
  ): Promise<Result<DeliveryRecord, WebhookRetryExhaustedError>> {
    const attempt = record.attempt + 1;
    const now = epochToIso(Date.now());

    if (result.success) {
      const updated: DeliveryRecord = {
        ...record,
        attempt,
        statusCode: result.statusCode,
        success: true,
        responseBody: result.responseBody,
        error: null,
        deliveredAt: now,
        nextRetryAt: null,
      };
      await this.store.update(record.id, updated);
      return ok(updated);
    }

    const maxAttempts = this.policy.maxAttempts;

    if (attempt >= maxAttempts) {
      const exhausted: DeliveryRecord = {
        ...record,
        attempt,
        statusCode: result.statusCode,
        success: false,
        responseBody: result.responseBody,
        error: result.error,
        deliveredAt: null,
        nextRetryAt: null,
      };
      await this.store.update(record.id, exhausted);
      return err(new WebhookRetryExhaustedError(record.id, attempt));
    }

    const nextRetryMs = computeRetryDelayMs(attempt + 1, this.policy);
    const nextRetryAt: IsoTimestamp = epochToIso(Date.now() + nextRetryMs);

    const updated: DeliveryRecord = {
      ...record,
      attempt,
      statusCode: result.statusCode,
      success: false,
      responseBody: result.responseBody,
      error: result.error,
      deliveredAt: null,
      nextRetryAt,
    };
    await this.store.update(record.id, updated);
    return ok(updated);
  }

  async getPendingDeliveries(subscriptionId: string): Promise<DeliveryRecord[]> {
    const records = await this.store.findBySubscriptionId(subscriptionId, 50);
    const now = Date.now();
    return records.filter(
      (r) => !r.success && r.nextRetryAt !== null && isoToMs(r.nextRetryAt) <= now,
    );
  }
}

function isoToMs(ts: IsoTimestamp): number {
  return new Date(ts).getTime();
}
