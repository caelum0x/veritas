// Maps internal health-aggregation and SLO types to status feature HTTP response shapes.
import type { HealthSnapshot } from "@veritas/health-aggregation";
import type { SloSummary, Slo } from "@veritas/slo";
import type { StatusPagePayload } from "../../render.js";

export interface HealthSnapshotDto {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly checks: ReadonlyArray<{
    readonly name: string;
    readonly status: "healthy" | "degraded" | "unhealthy";
    readonly latencyMs: number;
    readonly checkedAt: string;
    readonly error?: string;
    readonly metadata: Record<string, unknown>;
  }>;
  readonly timestamp: string;
  readonly version?: string;
}

export interface SloSummaryDto {
  readonly sloId: string;
  readonly sloName: string;
  readonly targetRatio: number;
  readonly currentRatio: number;
  readonly errorBudgetRemaining: number;
  readonly withinTarget: boolean;
  readonly evaluatedAt: string;
}

export interface SloDto {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly sliName: string;
  readonly targetRatio: number;
  readonly windowDurationMs: number;
  readonly windowKind: "rolling" | "calendar";
  readonly tags?: Record<string, string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Map a HealthSnapshot from @veritas/health-aggregation to HTTP DTO. */
export function mapHealthSnapshot(snapshot: HealthSnapshot): HealthSnapshotDto {
  return {
    status: snapshot.status,
    checks: snapshot.checks.map((c) => ({
      name: c.name,
      status: c.status,
      latencyMs: c.latencyMs,
      checkedAt: c.checkedAt,
      ...(c.error !== undefined ? { error: c.error } : {}),
      metadata: c.metadata,
    })),
    timestamp: snapshot.timestamp,
    ...(snapshot.version !== undefined ? { version: snapshot.version } : {}),
  };
}

/** Map an SloSummary from @veritas/slo to HTTP DTO. */
export function mapSloSummary(summary: SloSummary): SloSummaryDto {
  return {
    sloId: summary.sloId,
    sloName: summary.sloName,
    targetRatio: summary.targetRatio,
    currentRatio: summary.currentRatio,
    errorBudgetRemaining: summary.errorBudgetRemaining,
    withinTarget: summary.withinTarget,
    evaluatedAt: summary.evaluatedAt,
  };
}

/** Map an Slo entity to HTTP DTO. */
export function mapSlo(slo: Slo): SloDto {
  return {
    id: slo.id,
    name: slo.name,
    ...(slo.description !== undefined ? { description: slo.description } : {}),
    sliName: slo.sliName,
    targetRatio: slo.targetRatio,
    windowDurationMs: slo.windowDurationMs,
    windowKind: slo.windowKind,
    ...(slo.tags !== undefined ? { tags: slo.tags } : {}),
    createdAt: slo.createdAt,
    updatedAt: slo.updatedAt,
  };
}

/** Map the full StatusPagePayload to a serialisable response object. */
export function mapStatusPagePayload(payload: StatusPagePayload): unknown {
  return {
    pageStatus: payload.pageStatus,
    components: payload.components,
    activeIncidents: payload.activeIncidents,
    recentIncidents: payload.recentIncidents,
    sloSummaries: payload.sloSummaries.map(mapSloSummary),
    generatedAt: payload.generatedAt,
    version: payload.version,
  };
}
