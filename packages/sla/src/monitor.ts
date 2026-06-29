// SLA monitor: continuously evaluates metrics against targets and emits breach events.
import { EventBus, InMemoryEventBus, Logger, noopLogger, ok, err, Result, makeDomainEvent } from "@veritas/core";
import type { Sla } from "./sla.js";
import type { SlaTarget } from "./target.js";
import { meetsThreshold } from "./target.js";
import type { MetricDataPoint } from "./metric.js";
import { aggregateMetrics } from "./metric.js";
import type { SlaBreachEvent } from "./breach.js";
import { makeBreachEvent } from "./breach.js";
import { SlaNotFoundError } from "./errors.js";

export interface MonitorOptions {
  readonly logger?: Logger;
  readonly eventBus?: EventBus;
}

export interface SlaStore {
  getSla(id: string): Promise<Sla | null>;
  getTargetsForSla(slaId: string): Promise<readonly SlaTarget[]>;
  getMetrics(
    targetId: string,
    windowStart: string,
    windowEnd: string
  ): Promise<readonly MetricDataPoint[]>;
}

export interface BreachStore {
  recordBreach(event: SlaBreachEvent): Promise<void>;
}

export class SlaMonitor {
  readonly #store: SlaStore;
  readonly #breachStore: BreachStore;
  readonly #eventBus: EventBus;
  readonly #logger: Logger;

  constructor(
    store: SlaStore,
    breachStore: BreachStore,
    options: MonitorOptions = {}
  ) {
    this.#store = store;
    this.#breachStore = breachStore;
    this.#eventBus = options.eventBus ?? new InMemoryEventBus();
    this.#logger = options.logger ?? noopLogger;
  }

  async evaluateSla(
    slaId: string,
    windowStart: string,
    windowEnd: string
  ): Promise<Result<readonly SlaBreachEvent[]>> {
    const sla = await this.#store.getSla(slaId);
    if (!sla) return err(new SlaNotFoundError(slaId));

    const targets = await this.#store.getTargetsForSla(slaId);
    const breaches: SlaBreachEvent[] = [];

    for (const target of targets) {
      if (!target.enabled) continue;
      const points = await this.#store.getMetrics(target.id, windowStart, windowEnd);
      const agg = aggregateMetrics([...points], windowStart, windowEnd);
      if (!agg) continue;

      const measuredValue = this.#selectValue(target, agg);
      const compliant = meetsThreshold(measuredValue, target.threshold);

      if (!compliant) {
        const breach = makeBreachEvent({
          slaId,
          targetId: target.id,
          metricKind: target.metricKind,
          measuredValue,
          thresholdValue: target.threshold.value,
          operator: target.threshold.operator,
          windowStart,
          windowEnd,
          serviceId: sla.serviceId,
          organizationId: sla.organizationId,
        });
        breaches.push(breach);
        await this.#breachStore.recordBreach(breach);
        this.#eventBus.publish(makeDomainEvent({ type: "sla.breach", payload: breach }));
        this.#logger.warn("SLA breach detected", { slaId, targetId: target.id, measuredValue });
      }
    }

    return ok(breaches);
  }

  onBreach(handler: (breach: SlaBreachEvent) => void): () => void {
    return this.#eventBus.subscribe("sla.breach", handler as (payload: unknown) => void);
  }

  #selectValue(
    target: SlaTarget,
    agg: { mean: number; p50: number; p95: number; p99: number; min: number; max: number }
  ): number {
    switch (target.metricKind) {
      case "latency_p50": return agg.p50;
      case "latency_p95": return agg.p95;
      case "latency_p99": return agg.p99;
      case "uptime":
      case "availability":
      case "throughput":
      case "error_rate":
      case "custom":
      default:
        return agg.mean;
    }
  }
}
