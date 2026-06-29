// In-memory store for churn signals, risk scores, interventions, and health scores.
import { ok, err, Result } from '@veritas/core';
import type { UserId } from '@veritas/core';
import type { ChurnSignal, RiskScore, Intervention, AccountHealth, CohortMembership } from './types.js';
import {
  ChurnSignalNotFoundError,
  RiskScoreNotFoundError,
  InterventionNotFoundError,
  HealthScoreNotFoundError,
  CohortNotFoundError,
} from './errors.js';

export interface ChurnStore {
  saveSignals(userId: UserId, signals: ReadonlyArray<ChurnSignal>): Promise<Result<void>>;
  getSignals(userId: UserId): Promise<Result<ReadonlyArray<ChurnSignal>>>;

  saveRiskScore(score: RiskScore): Promise<Result<void>>;
  getRiskScore(userId: UserId): Promise<Result<RiskScore>>;
  listRiskScores(): Promise<Result<ReadonlyArray<RiskScore>>>;

  saveIntervention(intervention: Intervention): Promise<Result<void>>;
  getIntervention(id: string): Promise<Result<Intervention>>;
  listInterventions(userId: UserId): Promise<Result<ReadonlyArray<Intervention>>>;
  updateIntervention(id: string, patch: Partial<Intervention>): Promise<Result<Intervention>>;

  saveHealthScore(health: AccountHealth): Promise<Result<void>>;
  getHealthScore(userId: UserId): Promise<Result<AccountHealth>>;

  saveCohortMembership(membership: CohortMembership): Promise<Result<void>>;
  getCohortMembers(cohortId: string): Promise<Result<ReadonlyArray<CohortMembership>>>;
  getUserCohorts(userId: UserId): Promise<Result<ReadonlyArray<CohortMembership>>>;
}

export class InMemoryChurnStore implements ChurnStore {
  private readonly signals = new Map<string, ReadonlyArray<ChurnSignal>>();
  private readonly riskScores = new Map<string, RiskScore>();
  private readonly interventions = new Map<string, Intervention>();
  private readonly healthScores = new Map<string, AccountHealth>();
  private readonly cohorts = new Map<string, ReadonlyArray<CohortMembership>>();
  private readonly userCohorts = new Map<string, ReadonlyArray<CohortMembership>>();

  async saveSignals(userId: UserId, signals: ReadonlyArray<ChurnSignal>): Promise<Result<void>> {
    const existing = this.signals.get(userId) ?? [];
    this.signals.set(userId, [...existing, ...signals]);
    return ok(undefined);
  }

  async getSignals(userId: UserId): Promise<Result<ReadonlyArray<ChurnSignal>>> {
    const signals = this.signals.get(userId);
    if (!signals) return err(new ChurnSignalNotFoundError(userId));
    return ok(signals);
  }

  async saveRiskScore(score: RiskScore): Promise<Result<void>> {
    this.riskScores.set(score.userId, score);
    return ok(undefined);
  }

  async getRiskScore(userId: UserId): Promise<Result<RiskScore>> {
    const score = this.riskScores.get(userId);
    if (!score) return err(new RiskScoreNotFoundError(userId));
    return ok(score);
  }

  async listRiskScores(): Promise<Result<ReadonlyArray<RiskScore>>> {
    return ok(Array.from(this.riskScores.values()));
  }

  async saveIntervention(intervention: Intervention): Promise<Result<void>> {
    this.interventions.set(intervention.id, intervention);
    return ok(undefined);
  }

  async getIntervention(id: string): Promise<Result<Intervention>> {
    const intervention = this.interventions.get(id);
    if (!intervention) return err(new InterventionNotFoundError(id));
    return ok(intervention);
  }

  async listInterventions(userId: UserId): Promise<Result<ReadonlyArray<Intervention>>> {
    const result = Array.from(this.interventions.values()).filter((i) => i.userId === userId);
    return ok(result);
  }

  async updateIntervention(id: string, patch: Partial<Intervention>): Promise<Result<Intervention>> {
    const existing = this.interventions.get(id);
    if (!existing) return err(new InterventionNotFoundError(id));
    const updated = { ...existing, ...patch } as Intervention;
    this.interventions.set(id, updated);
    return ok(updated);
  }

  async saveHealthScore(health: AccountHealth): Promise<Result<void>> {
    this.healthScores.set(health.userId, health);
    return ok(undefined);
  }

  async getHealthScore(userId: UserId): Promise<Result<AccountHealth>> {
    const health = this.healthScores.get(userId);
    if (!health) return err(new HealthScoreNotFoundError(userId));
    return ok(health);
  }

  async saveCohortMembership(membership: CohortMembership): Promise<Result<void>> {
    const cohortMembers = this.cohorts.get(membership.cohortId) ?? [];
    this.cohorts.set(membership.cohortId, [...cohortMembers, membership]);
    const userMemberships = this.userCohorts.get(membership.userId) ?? [];
    this.userCohorts.set(membership.userId, [...userMemberships, membership]);
    return ok(undefined);
  }

  async getCohortMembers(cohortId: string): Promise<Result<ReadonlyArray<CohortMembership>>> {
    const members = this.cohorts.get(cohortId);
    if (!members) return err(new CohortNotFoundError(cohortId));
    return ok(members);
  }

  async getUserCohorts(userId: UserId): Promise<Result<ReadonlyArray<CohortMembership>>> {
    return ok(this.userCohorts.get(userId) ?? []);
  }
}
