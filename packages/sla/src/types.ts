// Shared types and interfaces for the SLA module.
import type { Result } from "@veritas/core";
import type { Sla, SlaStatus } from "./sla.js";
import type { SlaTarget } from "./target.js";
import type { MetricDataPoint, MetricAggregation } from "./metric.js";

export interface SlaWithTargets {
  readonly sla: Sla;
  readonly targets: readonly SlaTarget[];
}

export interface BreachRecord {
  readonly id: string;
  readonly slaId: string;
  readonly targetId: string;
  readonly detectedAt: string;
  readonly resolvedAt: string | undefined;
  readonly aggregation: MetricAggregation;
  readonly thresholdValue: number;
  readonly actualValue: number;
  readonly severity: BreachSeverity;
}

export type BreachSeverity = "low" | "medium" | "high" | "critical";

export interface CreditRecord {
  readonly id: string;
  readonly slaId: string;
  readonly breachId: string;
  readonly organizationId: string;
  readonly amountUsdc: bigint;
  readonly reason: string;
  readonly issuedAt: string;
  readonly appliedAt: string | undefined;
  readonly status: CreditStatus;
}

export type CreditStatus = "pending" | "applied" | "voided";

export interface ComplianceResult {
  readonly slaId: string;
  readonly targetId: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly compliant: boolean;
  readonly aggregation: MetricAggregation | null;
  readonly score: number;
}

export interface SlaReport {
  readonly slaId: string;
  readonly organizationId: string;
  readonly serviceId: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly overallCompliant: boolean;
  readonly complianceScore: number;
  readonly results: readonly ComplianceResult[];
  readonly breaches: readonly BreachRecord[];
  readonly credits: readonly CreditRecord[];
  readonly generatedAt: string;
}


export interface SlaFilter {
  readonly organizationId?: string;
  readonly serviceId?: string;
  readonly status?: SlaStatus;
  readonly effectiveAt?: string;
}

export interface MetricFilter {
  readonly slaId?: string;
  readonly targetId?: string;
  readonly serviceId?: string;
  readonly organizationId?: string;
  readonly from?: string;
  readonly to?: string;
}

export interface SlaRepository {
  findById(id: string): Promise<Result<Sla>>;
  findAll(filter?: SlaFilter): Promise<readonly Sla[]>;
  save(sla: Sla): Promise<Result<Sla>>;
  delete(id: string): Promise<Result<void>>;
}

export interface SlaTargetRepository {
  findById(id: string): Promise<Result<SlaTarget>>;
  findBySlaId(slaId: string): Promise<readonly SlaTarget[]>;
  save(target: SlaTarget): Promise<Result<SlaTarget>>;
  delete(id: string): Promise<Result<void>>;
}

export interface MetricRepository {
  save(point: MetricDataPoint): Promise<Result<MetricDataPoint>>;
  query(filter: MetricFilter): Promise<readonly MetricDataPoint[]>;
}
