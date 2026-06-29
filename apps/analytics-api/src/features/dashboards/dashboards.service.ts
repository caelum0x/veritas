// Dashboard service: CRUD operations and analytics assembly via package flows.
import { isOk, err, ok, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import {
  assembleDashboard,
  makeAnalyticsReport,
  computeMetricSeries,
  computeFunnel,
  verificationFunnelStageNames,
  computeRetentionCohort,
  computeVerificationUsageStats,
  analyticsQuery,
  type AnalyticsReportPeriod,
  type DashboardData,
} from "@veritas/analytics";
import type { Logger } from "@veritas/observability";
import type { DashboardStore, LocalDashboard } from "../../bootstrap.js";
import type { Deps } from "../../container.js";
import type {
  CreateDashboardBody,
  UpdateDashboardBody,
  DashboardDataQuery,
} from "./dashboards.schema.js";

export class DashboardsService {
  readonly #store: DashboardStore;
  readonly #deps: Deps;
  readonly #logger: Logger;

  constructor(deps: Deps) {
    this.#store = deps.dashboardStore;
    this.#deps = deps;
    this.#logger = deps.logger;
  }

  list(orgId: string, limit: number, offset: number): { items: readonly LocalDashboard[]; total: number } {
    const all = this.#store.list(orgId);
    const total = all.length;
    const items = all.slice(offset, offset + limit);
    return { items, total };
  }

  findById(id: string): Result<LocalDashboard, AppError> {
    const result = this.#store.findById(id);
    if (!isOk(result)) {
      return err({
        code: "NOT_FOUND",
        message: result.error.message,
      } as unknown as AppError);
    }
    return ok(result.value);
  }

  create(orgId: string, body: CreateDashboardBody): Result<LocalDashboard, AppError> {
    const input: Record<string, unknown> = {
      orgId,
      title: body.title,
      visibility: body.visibility,
      refreshInterval: body.refreshInterval,
      tags: body.tags,
      ...(body.description !== undefined ? { description: body.description } : {}),
    };
    const result = this.#store.create(input);
    if (!isOk(result)) {
      return err({
        code: "CONFLICT",
        message: result.error.message,
      } as unknown as AppError);
    }
    this.#logger.info("dashboards.service: created dashboard", { id: result.value.id, orgId });
    return ok(result.value);
  }

  update(id: string, body: UpdateDashboardBody): Result<LocalDashboard, AppError> {
    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch["title"] = body.title;
    if (body.description !== undefined) patch["description"] = body.description;
    if (body.visibility !== undefined) patch["visibility"] = body.visibility;
    if (body.refreshInterval !== undefined) patch["refreshInterval"] = body.refreshInterval;
    if (body.tags !== undefined) patch["tags"] = body.tags;

    const result = this.#store.update(id, patch);
    if (!isOk(result)) {
      return err({
        code: "NOT_FOUND",
        message: result.error.message,
      } as unknown as AppError);
    }
    this.#logger.info("dashboards.service: updated dashboard", { id });
    return ok(result.value);
  }

  archive(id: string): Result<LocalDashboard, AppError> {
    const result = this.#store.archive(id);
    if (!isOk(result)) {
      return err({
        code: "NOT_FOUND",
        message: result.error.message,
      } as unknown as AppError);
    }
    return ok(result.value);
  }

  delete(id: string): Result<true, AppError> {
    const result = this.#store.delete(id);
    if (!isOk(result)) {
      return err({
        code: "NOT_FOUND",
        message: result.error.message,
      } as unknown as AppError);
    }
    return ok(true);
  }

  async getDashboardData(query: DashboardDataQuery): Promise<Result<DashboardData, AppError>> {
    const { orgId, from, to, granularity } = query;
    const period: AnalyticsReportPeriod = { from, to, granularity };

    const analyticsStore = this.#deps.analyticsStore;

    const assemblerDeps = {
      getReport: async (organizationId: string, p: AnalyticsReportPeriod) => {
        const q = analyticsQuery()
          .forOrganization(organizationId)
          .from(p.from as never)
          .to(p.to as never)
          .withLimit(1000)
          .build();
        const qResult = analyticsStore.query(q);
        if (!isOk(qResult)) {
          return err({ code: "INTERNAL", message: qResult.error.message } as unknown as AppError);
        }
        const events = qResult.value.events;
        const series = computeMetricSeries("verifications", "count",
          events
            .filter((e) => e.type === "verification.completed")
            .map((e) => ({ timestamp: e.occurredAt, value: 1 }))
        );
        const report = makeAnalyticsReport({
          id: `report-${organizationId}-${Date.now()}`,
          organizationId,
          period: p,
          summary: {
            totalVerifications: events.filter((e) => e.type === "verification.completed").length,
            totalClaims: events.filter((e) => e.type === "claim.verified" || e.type === "claim.rejected").length,
            totalSources: 0,
            totalUsers: new Set(events.map((e) => e.userId).filter(Boolean)).size,
            averageConfidence: 0,
            averageProcessingMs: 0,
            verdictDistribution: { true: 0, false: 0, unverifiable: 0, disputed: 0, total: 0 },
          },
          series: [series],
        });
        return ok(report);
      },
      getFunnel: async (organizationId: string, p: AnalyticsReportPeriod) => {
        const stageNames = verificationFunnelStageNames();
        const q = analyticsQuery()
          .forOrganization(organizationId)
          .from(p.from as never)
          .to(p.to as never)
          .withLimit(1000)
          .build();
        const qResult = analyticsStore.query(q);
        const events = isOk(qResult) ? qResult.value.events : [];
        const stageCounts = stageNames.map((name) => ({
          name,
          label: name.replace(/_/g, " "),
          count: events.filter((e) => e.type === name).length,
        }));
        return ok(computeFunnel({ organizationId, periodFrom: p.from, periodTo: p.to, stageCounts }));
      },
      getRetention: async (organizationId: string, p: AnalyticsReportPeriod) => {
        return ok(computeRetentionCohort({
          organizationId,
          cohortDate: p.from,
          cohortSize: 0,
          granularity: "day",
          periodicActiveCounts: [],
        }));
      },
      getUsageStats: async (organizationId: string, p: AnalyticsReportPeriod) => {
        const q = analyticsQuery()
          .forOrganization(organizationId)
          .from(p.from as never)
          .to(p.to as never)
          .withLimit(1000)
          .build();
        const qResult = analyticsStore.query(q);
        const events = isOk(qResult) ? qResult.value.events : [];
        const verifications = events.filter((e) => e.type === "verification.completed").length;
        return ok(computeVerificationUsageStats({
          organizationId,
          periodFrom: p.from,
          periodTo: p.to,
          verifications,
          claims: 0,
          sources: 0,
          tokensConsumed: 0,
          processingTimesMs: events.map((e) => e.durationMs ?? 0).filter((d) => d > 0),
          errors: events.filter((e) => e.success === false).length,
          verdictCounts: {},
          sourceCounts: {},
          agentCounts: {},
          hourlyCounts: [],
          quotaLimit: null,
        }));
      },
    };

    return assembleDashboard(orgId, period, assemblerDeps);
  }
}
