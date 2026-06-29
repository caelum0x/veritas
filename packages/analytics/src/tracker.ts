// Tracker interface and default implementation for recording analytics events
import { newId, Clock, systemClock, epochToIso, Logger, noopLogger } from "@veritas/core";
import { AnalyticsEvent, AnalyticsEventType, CreateAnalyticsEvent } from "./event.js";
import { AnalyticsStore } from "./store.js";

export interface Tracker {
  track(event: CreateAnalyticsEvent): Promise<void>;
  trackType(
    type: AnalyticsEventType,
    opts?: Partial<Omit<CreateAnalyticsEvent, "type">>
  ): Promise<void>;
  flush(): Promise<void>;
}

export interface TrackerConfig {
  store: AnalyticsStore;
  clock?: Clock;
  logger?: Logger;
  batchSize?: number;
  flushIntervalMs?: number;
}

export class DefaultTracker implements Tracker {
  private readonly store: AnalyticsStore;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private readonly batchSize: number;
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(config: TrackerConfig) {
    this.store = config.store;
    this.clock = config.clock ?? systemClock;
    this.logger = config.logger ?? noopLogger;
    this.batchSize = config.batchSize ?? 50;

    if (config.flushIntervalMs !== undefined && config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => {
        void this.flush();
      }, config.flushIntervalMs);
    }
  }

  async track(event: CreateAnalyticsEvent): Promise<void> {
    const now = epochToIso(this.clock.now());
    const full: AnalyticsEvent = {
      ...event,
      id: newId("evt"),
      occurredAt: event.occurredAt ?? now,
      properties: event.properties ?? {},
    };
    this.queue.push(full);
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  async trackType(
    type: AnalyticsEventType,
    opts: Partial<Omit<CreateAnalyticsEvent, "type">> = {}
  ): Promise<void> {
    await this.track({ type, ...opts });
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      for (const event of batch) {
        this.store.insert(event);
      }
    } catch (err) {
      this.logger.error("analytics tracker flush failed", { error: err, count: batch.length });
    }
  }

  dispose(): void {
    if (this.flushTimer !== undefined) {
      clearInterval(this.flushTimer);
    }
  }
}
