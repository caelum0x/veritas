// SLO feature service — orchestrates SLO CRUD, evaluation, burn alerts, and reports via @veritas/slo.
import { type Result, ok, err, isErr } from "@veritas/core";
import {
  type Slo,
  type SloEvaluationResult,
  type BurnAlertEvent,
  type SloReport,
  type SloRepository,
  type SloEvaluationRepository,
  type BurnAlertRepository,
  type SloReportRepository,
  makeSlo,
  updateSlo,
  evaluateSlo,
  generateSloReport,
  InMemorySliSource,
  SloNotFoundError,
} from "@veritas/slo";
import type { CreateSloBody, UpdateSloBody, EvaluateSloBody } from "./slo.schema.js";

/** Subset of Deps that the SLO feature requires. */
export interface SloDeps {
  readonly sloRepo: SloRepository;
  readonly sloEvalRepo: SloEvaluationRepository;
  readonly burnAlertRepo: BurnAlertRepository;
  readonly sloReportRepo: SloReportRepository;
}

export class SloFeatureService {
  private readonly sloRepo: SloRepository;
  private readonly evalRepo: SloEvaluationRepository;
  private readonly burnAlertRepo: BurnAlertRepository;
  private readonly reportRepo: SloReportRepository;

  constructor(deps: SloDeps) {
    this.sloRepo = deps.sloRepo;
    this.evalRepo = deps.sloEvalRepo;
    this.burnAlertRepo = deps.burnAlertRepo;
    this.reportRepo = deps.sloReportRepo;
  }

  async list(): Promise<readonly Slo[]> {
    return this.sloRepo.findAll();
  }

  async create(body: CreateSloBody): Promise<Result<Slo>> {
    const now = new Date().toISOString();
    const slo = makeSlo(
      {
        name: body.name,
        description: body.description,
        sliName: body.sliName,
        targetRatio: body.targetRatio,
        windowDurationMs: body.windowDurationMs,
        windowKind: body.windowKind,
        tags: body.tags,
      },
      now,
    );
    return this.sloRepo.save(slo);
  }

  async get(id: string): Promise<Result<Slo>> {
    return this.sloRepo.findById(id);
  }

  async update(id: string, body: UpdateSloBody): Promise<Result<Slo>> {
    const existing = await this.sloRepo.findById(id);
    if (isErr(existing)) return existing;
    const now = new Date().toISOString();
    const updated = updateSlo(existing.value, body, now);
    return this.sloRepo.save(updated);
  }

  async remove(id: string): Promise<Result<void>> {
    return this.sloRepo.delete(id);
  }

  /** Record a manual evaluation observation and persist the result. */
  async evaluate(id: string, body: EvaluateSloBody): Promise<Result<SloEvaluationResult>> {
    const sloResult = await this.sloRepo.findById(id);
    if (isErr(sloResult)) return sloResult;

    const slo = sloResult.value;
    const nowMs = body.nowMs ?? Date.now();

    const source = new InMemorySliSource();
    source.record({
      sliName: slo.sliName,
      windowStartMs: nowMs - slo.windowDurationMs,
      windowEndMs: nowMs,
      goodCount: body.goodCount,
      totalCount: body.totalCount,
    });

    const evalResult = await evaluateSlo(
      {
        slo,
        objective: { targetRatio: slo.targetRatio },
        window: { durationMs: slo.windowDurationMs },
        nowMs,
      },
      source,
    );

    if (isErr(evalResult)) return evalResult;

    const saved = await this.evalRepo.save(evalResult.value);
    return saved;
  }

  async listEvaluations(sloId: string, limit: number): Promise<readonly SloEvaluationResult[]> {
    return this.evalRepo.findBySloId(sloId, limit);
  }

  async getEvaluation(evalId: string): Promise<Result<SloEvaluationResult>> {
    return this.evalRepo.findById(evalId);
  }

  async listBurnAlerts(sloId: string, limit: number): Promise<readonly BurnAlertEvent[]> {
    return this.burnAlertRepo.findBySloId(sloId, limit);
  }

  /** Generate a compliance report from stored evaluations and persist it. */
  async generateReport(sloId: string): Promise<Result<SloReport>> {
    const sloResult = await this.sloRepo.findById(sloId);
    if (isErr(sloResult)) return sloResult;

    const slo = sloResult.value;
    const evaluations = await this.evalRepo.findBySloId(sloId);
    const alertEvents = await this.burnAlertRepo.findBySloId(sloId);

    const report = generateSloReport({
      sloId,
      sliName: slo.sliName,
      targetRatio: slo.targetRatio,
      evaluations,
      alertEvents,
      nowMs: Date.now(),
    });

    return this.reportRepo.save(report);
  }

  async listReports(sloId: string, limit: number): Promise<readonly SloReport[]> {
    return this.reportRepo.findBySloId(sloId, limit);
  }

  async getReport(reportId: string): Promise<Result<SloReport>> {
    return this.reportRepo.findById(reportId);
  }
}
