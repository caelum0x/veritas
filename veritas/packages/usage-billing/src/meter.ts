// Usage meter: records usage events and buffers them for downstream processing.

import { Id, Logger, noopLogger, EventBus, makeDomainEvent } from "@veritas/core";
import { UsageMetric, UsageEvent, createUsageEvent } from "./event.js";

export interface MeterOptions {
  readonly logger?: Logger;
  readonly eventBus?: EventBus;
  /** Maximum number of events to buffer before oldest are dropped (default: 10_000). */
  readonly maxBufferSize?: number;
}

/** In-memory usage meter with optional event bus publication. */
export class UsageMeter {
  private readonly logger: Logger;
  private readonly eventBus: EventBus | null;
  private readonly maxBufferSize: number;
  private readonly buffer: UsageEvent[] = [];

  constructor(opts: MeterOptions = {}) {
    this.logger = opts.logger ?? noopLogger;
    this.eventBus = opts.eventBus ?? null;
    this.maxBufferSize = opts.maxBufferSize ?? 10_000;
  }

  /** Record a usage event; publishes to event bus if configured. */
  async record(
    organizationId: Id<string>,
    metric: UsageMetric,
    quantity: number,
    opts: {
      userId?: Id<string>;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<UsageEvent> {
    const event = createUsageEvent(organizationId, metric, quantity, opts);

    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift();
    }
    this.buffer.push(event);

    this.logger.info("usage_meter.record", {
      id: event.id,
      organizationId,
      metric,
      quantity,
    });

    if (this.eventBus) {
      const domainEvent = makeDomainEvent({
        type: "usage_billing.event_recorded",
        payload: {
          usageEventId: event.id,
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

  /** Return and clear all buffered events. */
  flush(): readonly UsageEvent[] {
    const snapshot = this.buffer.splice(0);
    return Object.freeze(snapshot);
  }

  /** Return buffered events without clearing. */
  peek(): readonly UsageEvent[] {
    return Object.freeze([...this.buffer]);
  }

  /** Current number of buffered events. */
  get size(): number {
    return this.buffer.length;
  }
}
