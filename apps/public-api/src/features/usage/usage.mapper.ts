// Maps @veritas/usage-billing and @veritas/services domain objects to HTTP response DTOs.
import type { UsageEvent } from "@veritas/usage-billing";
import type { OverageResult, OverageLine } from "@veritas/usage-billing";
import type { Usage } from "@veritas/contracts";
import type { UsageSummaryResult } from "./usage.service.js";

export interface UsageEventDto {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string | null;
  readonly metric: string;
  readonly quantity: number;
  readonly occurredAt: string;
  readonly metadata: Record<string, string>;
}

export interface OverageLineDto {
  readonly metric: string;
  readonly totalQuantity: number;
  readonly includedUnits: number;
  readonly overageQuantity: number;
  readonly pricePerUnit: string;
  readonly charge: string;
}

export interface OverageResultDto {
  readonly window: { readonly start: string; readonly end: string; readonly interval: string };
  readonly lines: readonly OverageLineDto[];
  readonly totalCharge: string;
}

export interface UsageSummaryDto {
  readonly organizationId: string;
  readonly metric: string;
  readonly from: string;
  readonly to: string;
  readonly totalQuantity: number;
}

export function toUsageEventDto(event: UsageEvent): UsageEventDto {
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

function toOverageLineDto(line: OverageLine): OverageLineDto {
  return {
    metric: line.metric,
    totalQuantity: line.totalQuantity,
    includedUnits: line.includedUnits,
    overageQuantity: line.overageQuantity,
    pricePerUnit: line.pricePerUnit.toString(),
    charge: line.charge.toString(),
  };
}

export function toOverageResultDto(result: OverageResult): OverageResultDto {
  return {
    window: {
      start: result.window.start,
      end: result.window.end,
      interval: result.window.interval,
    },
    lines: result.lines.map(toOverageLineDto),
    totalCharge: result.totalCharge.toString(),
  };
}

export function toUsageSummaryDto(summary: UsageSummaryResult): UsageSummaryDto {
  return {
    organizationId: summary.organizationId,
    metric: summary.metric,
    from: summary.from,
    to: summary.to,
    totalQuantity: summary.totalQuantity,
  };
}

export function toUsageDto(usage: Usage): Usage {
  return { ...usage };
}
