// Maps internal DeliveryRecord domain objects to HTTP response shapes.

import type { DeliveryRecord } from "@veritas/webhooks";
import type { DeliveryResponse } from "./deliveries.schema.js";

export function toDeliveryResponse(record: DeliveryRecord): DeliveryResponse {
  return {
    id: record.id,
    subscriptionId: record.subscriptionId,
    eventId: record.eventId,
    eventType: record.eventType,
    attempt: record.attempt,
    statusCode: record.statusCode,
    success: record.success,
    responseBody: record.responseBody,
    error: record.error,
    deliveredAt: record.deliveredAt,
    nextRetryAt: record.nextRetryAt,
    createdAt: record.createdAt,
  };
}

export function toDeliveryResponseList(records: readonly DeliveryRecord[]): DeliveryResponse[] {
  return records.map(toDeliveryResponse);
}
