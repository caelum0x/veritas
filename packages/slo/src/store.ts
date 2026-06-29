// In-memory SLO store: repositories for SLOs, evaluation results, alerts, and reports.
import { ok, err, type Result } from "@veritas/core";
import { type Slo } from "./slo.js";
import { type SloEvaluationResult } from "./evaluator.js";
import { type BurnAlertEvent } from "./alert.js";
import { type SloReport } from "./report.js";
import { SloNotFoundError, SloEvaluationError } from "./errors.js";

export interface SloRepository {
  findById(id: string): Promise<Result<Slo>>;
  findAll(): Promise<readonly Slo[]>;
  findBySliName(sliName: string): Promise<readonly Slo[]>;
  save(slo: Slo): Promise<Result<Slo>>;
  delete(id: string): Promise<Result<void>>;
}

export interface SloEvaluationRepository {
  save(result: SloEvaluationResult): Promise<Result<SloEvaluationResult>>;
  findBySloId(sloId: string, limit?: number): Promise<readonly SloEvaluationResult[]>;
  findById(id: string): Promise<Result<SloEvaluationResult>>;
}

export interface BurnAlertRepository {
  save(event: BurnAlertEvent): Promise<Result<BurnAlertEvent>>;
  findBySloId(sloId: string, limit?: number): Promise<readonly BurnAlertEvent[]>;
}

export interface SloReportRepository {
  save(report: SloReport): Promise<Result<SloReport>>;
  findBySloId(sloId: string, limit?: number): Promise<readonly SloReport[]>;
  findById(id: string): Promise<Result<SloReport>>;
}

export class InMemorySloRepository implements SloRepository {
  private readonly store = new Map<string, Slo>();

  async findById(id: string): Promise<Result<Slo>> {
    const slo = this.store.get(id);
    if (slo === undefined) return err(new SloNotFoundError(id));
    return ok(slo);
  }

  async findAll(): Promise<readonly Slo[]> {
    return Object.freeze([...this.store.values()]);
  }

  async findBySliName(sliName: string): Promise<readonly Slo[]> {
    return Object.freeze([...this.store.values()].filter((s) => s.sliName === sliName));
  }

  async save(slo: Slo): Promise<Result<Slo>> {
    this.store.set(slo.id, slo);
    return ok(slo);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.store.has(id)) return err(new SloNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }
}

export class InMemorySloEvaluationRepository implements SloEvaluationRepository {
  private readonly store: SloEvaluationResult[] = [];

  async save(result: SloEvaluationResult): Promise<Result<SloEvaluationResult>> {
    this.store.push(result);
    return ok(result);
  }

  async findBySloId(sloId: string, limit?: number): Promise<readonly SloEvaluationResult[]> {
    const filtered = this.store.filter((r) => r.sloId === sloId);
    const sliced = limit !== undefined ? filtered.slice(-limit) : filtered;
    return Object.freeze(sliced);
  }

  async findById(id: string): Promise<Result<SloEvaluationResult>> {
    const result = this.store.find((r) => r.id === id);
    if (result === undefined) return err(new SloEvaluationError(`Evaluation not found: ${id}`));
    return ok(result);
  }
}

export class InMemoryBurnAlertRepository implements BurnAlertRepository {
  private readonly store: BurnAlertEvent[] = [];

  async save(event: BurnAlertEvent): Promise<Result<BurnAlertEvent>> {
    this.store.push(event);
    return ok(event);
  }

  async findBySloId(sloId: string, limit?: number): Promise<readonly BurnAlertEvent[]> {
    const filtered = this.store.filter((e) => e.sloId === sloId);
    const sliced = limit !== undefined ? filtered.slice(-limit) : filtered;
    return Object.freeze(sliced);
  }
}

export class InMemorySloReportRepository implements SloReportRepository {
  private readonly store: SloReport[] = [];

  async save(report: SloReport): Promise<Result<SloReport>> {
    this.store.push(report);
    return ok(report);
  }

  async findBySloId(sloId: string, limit?: number): Promise<readonly SloReport[]> {
    const filtered = this.store.filter((r) => r.sloId === sloId);
    const sliced = limit !== undefined ? filtered.slice(-limit) : filtered;
    return Object.freeze(sliced);
  }

  async findById(id: string): Promise<Result<SloReport>> {
    const report = this.store.find((r) => r.id === id);
    if (report === undefined) return err(new SloEvaluationError(`Report not found: ${id}`));
    return ok(report);
  }
}
