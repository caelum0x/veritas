// Maps @veritas/usage-billing domain objects to HTTP response shapes.

import type { UsageEvent } from "@veritas/usage-billing";
import type { PeriodUsage } from "@veritas/billing";
import type { UsageEventResponse, PeriodUsageResponse } from "./usage.schema.js";

export function toUsageEventResponse(event: UsageEvent): UsageEventResponse {
  return {
    id: event.id,
    organizationId: event.organizationId,
    userId: event.userId,
    metric: event.metric,
    quantity: event.quantity,
    occurredAt: event.occurredAt,
    metadata: { ...event.metadata },
  };
}

export function toPeriodUsageResponse(period: PeriodUsage): PeriodUsageResponse {
  return {
    organizationId: period.organizationId as string,
    metric: period.metric,
    periodStart: period.periodStart as string,
    periodEnd: period.periodEnd as string,
    totalQuantity: period.totalQuantity,
    eventCount: period.eventCount,
  };
}
