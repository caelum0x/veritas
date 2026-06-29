// Maps domain Usage entities and summary outputs to API response shapes.
import type { Usage } from "@veritas/contracts";
import type { UsageSummaryOutput } from "@veritas/services/usage-metering/usage-metering.dto.js";

export interface UsageResponse {
  readonly id: string;
  readonly organizationId: string;
  readonly subscriptionId: string | null;
  readonly metric: string;
  readonly quantity: number;
  readonly recordedAt: string;
  readonly idempotencyKey: string | null;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UsageSummaryResponse {
  readonly organizationId: string;
  readonly metric: string;
  readonly from: string;
  readonly to: string;
  readonly totalQuantity: number;
}

export function toUsageResponse(usage: Usage): UsageResponse {
  return {
    id: usage.id,
    organizationId: usage.organizationId,
    subscriptionId: usage.subscriptionId,
    metric: usage.metric,
    quantity: usage.quantity,
    recordedAt: usage.recordedAt,
    idempotencyKey: usage.idempotencyKey,
    metadata: usage.metadata,
    createdAt: usage.createdAt,
    updatedAt: usage.updatedAt,
  };
}

export function toUsageSummaryResponse(summary: UsageSummaryOutput): UsageSummaryResponse {
  return {
    organizationId: summary.organizationId,
    metric: summary.metric,
    from: summary.from,
    to: summary.to,
    totalQuantity: summary.totalQuantity,
  };
}
