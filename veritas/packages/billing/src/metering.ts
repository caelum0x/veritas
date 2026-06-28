// Metering: record and emit usage metering events for billing purposes.

import { newId, Id, IsoTimestamp, epochToIso, EventBus, makeDomainEvent, Logger, noopLogger } from "@veritas/core";
import { UsageMetricSchema } from "@veritas/contracts";
import { z } from "zod";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface MeteringEvent {
  readonly id: Id<"metering">;
  readonly organizationId: Id<string>;
  readonly userId: Id<string> | null;
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly occurredAt: IsoTimestamp;
  readonly metadata: Record<string, string>;
}

export interface MeteringOptions {
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

export function createMeteringEvent(
  organizationId: Id<string>,
  metric: UsageMetric,
  quantity: number,
  opts: {
    userId?: Id<string>;
    metadata?: Record<string, string>;
    occurredAt?: IsoTimestamp;
  } = {}
): MeteringEvent {
  if (quantity < 0) {
    throw new Error(`Metering quantity must be non-negative, got ${quantity}`);
  }
  return {
    id: newId("metering"),
    organizationId,
    userId: opts.userId ?? null,
    metric,
    quantity,
    occurredAt: opts.occurredAt ?? epochToIso(Date.now()),
    metadata: opts.metadata ?? {},
  };
}

export class MeteringService {
  private readonly eventBus: EventBus | null;
  private readonly logger: Logger;
  private readonly buffer: MeteringEvent[] = [];

  constructor(opts: MeteringOptions = {}) {
    this.eventBus = opts.eventBus ?? null;
    this.logger = opts.logger ?? noopLogger;
  }

  async record(
    organizationId: Id<string>,
    metric: UsageMetric,
    quantity: number,
    meta: { userId?: Id<string>; metadata?: Record<string, string> } = {}
  ): Promise<MeteringEvent> {
    const event = createMeteringEvent(organizationId, metric, quantity, meta);
    this.buffer.push(event);

    this.logger.info("metering.record", {
      id: event.id,
      organizationId,
      metric,
      quantity,
    });

    if (this.eventBus) {
      const domainEvent = makeDomainEvent({
        type: "billing.usage_recorded",
        payload: {
          meteringEventId: event.id,
          organizationId,
          metric,
          quantity,
          occurredAt: event.occurredAt,
        },
      });
      await this.eventBus.publish(domainEvent);
    }

    return event;
  }

  flush(): readonly MeteringEvent[] {
    const snapshot = [...this.buffer];
    this.buffer.length = 0;
    return snapshot;
  }

  peek(): readonly MeteringEvent[] {
    return [...this.buffer];
  }
}
