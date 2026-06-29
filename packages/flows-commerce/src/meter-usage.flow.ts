// Meter-usage flow: record a usage event via the usage meter and emit a domain event.

import {
  ok,
  err,
  isErr,
  tryAsync,
  toAppError,
  type Result,
  type Id,
  type EventBus,
  type Logger,
  noopLogger,
} from "@veritas/core";
import { UsageMeter } from "@veritas/usage-billing";
import type { UsageMetric } from "@veritas/usage-billing";
import { UsageMeterError } from "./errors.js";
import { makeUsageMeteredEvent } from "./events.js";

export interface MeterUsageInput {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly userId?: Id<string>;
  readonly metadata?: Record<string, string>;
}

export interface MeterUsageOutput {
  readonly usageEventId: string;
  readonly organizationId: string;
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly occurredAt: string;
}

export interface MeterUsageFlowPorts {
  readonly usageMeter: UsageMeter;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

/** Flow: record a usage event and publish a domain event for downstream billing. */
export async function meterUsageFlow(
  input: MeterUsageInput,
  ports: MeterUsageFlowPorts,
): Promise<Result<MeterUsageOutput>> {
  const logger = ports.logger ?? noopLogger;

  if (input.quantity < 0) {
    return err(
      new UsageMeterError({ message: `Usage quantity must be non-negative, got ${input.quantity}` }),
    );
  }

  const recordResult = await tryAsync(() =>
    ports.usageMeter.record(input.organizationId, input.metric, input.quantity, {
      userId: input.userId,
      metadata: input.metadata,
    }),
  );

  if (isErr(recordResult)) {
    const appErr = toAppError(recordResult.error);
    logger.warn("meter_usage_flow.record_failed", {
      organizationId: input.organizationId as string,
      metric: input.metric,
      error: appErr.message,
    });
    return err(appErr);
  }

  const usageEvent = recordResult.value;

  if (ports.eventBus) {
    const domainEvent = makeUsageMeteredEvent({
      organizationId: input.organizationId as string,
      metric: input.metric,
      quantity: input.quantity,
      usageEventId: usageEvent.id,
      occurredAt: usageEvent.occurredAt as unknown as import("@veritas/core").IsoTimestamp,
    });
    await ports.eventBus.publish(domainEvent).catch((e: unknown) => {
      logger.warn("meter_usage_flow.event_publish_failed", { error: String(e) });
    });
  }

  logger.info("meter_usage_flow.completed", {
    usageEventId: usageEvent.id,
    organizationId: input.organizationId as string,
    metric: input.metric,
    quantity: input.quantity,
  });

  return ok({
    usageEventId: usageEvent.id,
    organizationId: input.organizationId as string,
    metric: input.metric,
    quantity: input.quantity,
    occurredAt: usageEvent.occurredAt,
  });
}
