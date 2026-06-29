// In-memory implementations of SLA, target, and metric repositories.
import { ok, err, type Result } from "@veritas/core";
import type { Sla, SlaStatus } from "./sla.js";
import type { SlaTarget } from "./target.js";
import type { MetricDataPoint } from "./metric.js";
import type {
  SlaRepository,
  SlaTargetRepository,
  MetricRepository,
  SlaFilter,
  MetricFilter,
} from "./types.js";
import {
  SlaNotFoundError,
  SlaTargetNotFoundError,
} from "./errors.js";

export class InMemorySlaRepository implements SlaRepository {
  private readonly store = new Map<string, Sla>();

  async findById(id: string): Promise<Result<Sla>> {
    const sla = this.store.get(id);
    if (sla === undefined) return err(new SlaNotFoundError(id));
    return ok(sla);
  }

  async findAll(filter?: SlaFilter): Promise<readonly Sla[]> {
    const all = [...this.store.values()];
    return all.filter((sla) => {
      if (filter?.organizationId !== undefined && sla.organizationId !== filter.organizationId) return false;
      if (filter?.serviceId !== undefined && sla.serviceId !== filter.serviceId) return false;
      if (filter?.status !== undefined && sla.status !== filter.status) return false;
      if (filter?.effectiveAt !== undefined) {
        if (filter.effectiveAt < sla.effectiveFrom) return false;
        if (sla.effectiveTo !== undefined && filter.effectiveAt > sla.effectiveTo) return false;
      }
      return true;
    });
  }

  async save(sla: Sla): Promise<Result<Sla>> {
    this.store.set(sla.id, sla);
    return ok(sla);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.has(id)) return err(new SlaNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }
}

export class InMemorySlaTargetRepository implements SlaTargetRepository {
  private readonly store = new Map<string, SlaTarget>();

  async findById(id: string): Promise<Result<SlaTarget>> {
    const target = this.store.get(id);
    if (target === undefined) return err(new SlaTargetNotFoundError(id));
    return ok(target);
  }

  async findBySlaId(slaId: string): Promise<readonly SlaTarget[]> {
    return [...this.store.values()].filter((t) => t.slaId === slaId);
  }

  async save(target: SlaTarget): Promise<Result<SlaTarget>> {
    this.store.set(target.id, target);
    return ok(target);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.has(id)) return err(new SlaTargetNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }
}

export class InMemoryMetricRepository implements MetricRepository {
  private readonly store: MetricDataPoint[] = [];

  async save(point: MetricDataPoint): Promise<Result<MetricDataPoint>> {
    this.store.push(point);
    return ok(point);
  }

  async query(filter: MetricFilter): Promise<readonly MetricDataPoint[]> {
    return this.store.filter((p) => {
      if (filter.slaId !== undefined && p.slaId !== filter.slaId) return false;
      if (filter.targetId !== undefined && p.targetId !== filter.targetId) return false;
      if (filter.serviceId !== undefined && p.serviceId !== filter.serviceId) return false;
      if (filter.organizationId !== undefined && p.organizationId !== filter.organizationId) return false;
      if (filter.from !== undefined && p.sampledAt < filter.from) return false;
      if (filter.to !== undefined && p.sampledAt > filter.to) return false;
      return true;
    });
  }
}
