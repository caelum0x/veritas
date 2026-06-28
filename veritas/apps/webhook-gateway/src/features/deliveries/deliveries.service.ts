// Delivery service: queries and retries webhook deliveries via DeliveryTracker and WebhookRegistry.

import { ok, err, isErr, epochToIso, NotFoundError, type Result } from "@veritas/core";
import type { DeliveryRecord, DeliveryStore } from "@veritas/webhooks";
import type { Deps } from "../../container.js";

// DeliveryTracker holds a store privately; we reach it via a structural cast.
// This is safe because the in-memory store is always the concrete implementation.
type TrackerWithStore = { store: DeliveryStore };

function storeFrom(tracker: Deps["deliveryTracker"]): DeliveryStore {
  return (tracker as unknown as TrackerWithStore).store;
}

export class DeliveriesService {
  private readonly tracker: Deps["deliveryTracker"];
  private readonly registry: Deps["webhookRegistry"];
  private readonly logger: Deps["logger"];

  constructor(deps: Pick<Deps, "deliveryTracker" | "webhookRegistry" | "logger">) {
    this.tracker = deps.deliveryTracker;
    this.registry = deps.webhookRegistry;
    this.logger = deps.logger;
  }

  async listBySubscription(
    subscriptionId: string,
    limit = 50,
  ): Promise<Result<DeliveryRecord[], NotFoundError>> {
    const subResult = await this.registry.getById(subscriptionId);
    if (isErr(subResult)) {
      return err(new NotFoundError(`Subscription not found: ${subscriptionId}`));
    }

    const records = await storeFrom(this.tracker).findBySubscriptionId(subscriptionId, limit);

    this.logger.info("Listed deliveries", { subscriptionId, count: records.length });
    return ok(records);
  }

  async getById(deliveryId: string): Promise<Result<DeliveryRecord, NotFoundError>> {
    const record = await storeFrom(this.tracker).findById(deliveryId);
    if (record === null) {
      return err(new NotFoundError(`Delivery not found: ${deliveryId}`));
    }
    this.logger.info("Fetched delivery", { deliveryId, success: record.success });
    return ok(record);
  }

  async retryDelivery(deliveryId: string): Promise<Result<DeliveryRecord, NotFoundError>> {
    const recordResult = await this.getById(deliveryId);
    if (isErr(recordResult)) {
      return recordResult;
    }

    const record = recordResult.value;

    if (record.success) {
      this.logger.info("Delivery already succeeded, no retry needed", { deliveryId });
      return ok(record);
    }

    const nextRetryAt = epochToIso(Date.now());
    const patched: DeliveryRecord = { ...record, nextRetryAt };

    await storeFrom(this.tracker).update(deliveryId, { nextRetryAt });

    this.logger.info("Delivery queued for retry", { deliveryId, attempt: record.attempt });
    return ok(patched);
  }
}
