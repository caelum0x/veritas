// Metrics service: computes KPIs, platform metrics, trust trends via analytics package.
import { isOk, ok, err, type Result, newId } from "@veritas/core";
import type { AppError } from "@veritas/core";
import {
  aggregateEvents,
  computeVerificationKpis,
  computeEngagementKpis,
  computeQualityKpis,
  computePlatformMetrics,
  computeTrustTrends,
  makeAnalyticsReport,
  computeMetricSeries,
  analyticsQuery,
  type PlatformMetrics,
  type TrustTrendSeries,
  type AnalyticsReport,
  type AnalyticsQueryResult,
  type AnalyticsEventType,
} from "@veritas/analytics";
import type { Deps } from "../../container.js";
import type {
  MetricsQuery,
  PlatformMetricsQuery,
  TrustTrendsQuery,
  AnalyticsReportQuery,
  EventsQuery,
  TrackEventBody,
} from "./metrics.schema.js";

export class MetricsService {
  readonly #deps: Deps;

  constructor(deps: Deps) {
    this.#deps = deps;
  }

  async getVerificationMetrics(query: MetricsQuery): Promise<Result<PlatformMetrics, AppError>> {
    const { orgId, from, to, granularity, windowHours } = query;
    const q = analyticsQuery()
      .forOrganization(orgId)
      .from(from as never)
      .to(to as never)
      .withLimit(1000)
      .build();

    const storeResult = this.#deps.analyticsStore.query(q);
    if (!isOk(storeResult)) {
      return err({ code: "INTERNAL", message: storeResult.error.message } as unknown as AppError);
    }

    const events = storeResult.value.events;
    const buckets = aggregateEvents(events, { granularity, filterOrganizationId: orgId });
    const metrics = computePlatformMetrics(buckets, events, windowHours);
    return ok(metrics);
  }

  async getPlatformMetrics(query: PlatformMetricsQuery): Promise<Result<PlatformMetrics, AppError>> {
    const { from, to, granularity, windowHours } = query;
    const q = analyticsQuery()
      .from(from as never)
      .to(to as never)
      .withLimit(1000)
      .build();

    const storeResult = this.#deps.analyticsStore.query(q);
    if (!isOk(storeResult)) {
      return err({ code: "INTERNAL", message: storeResult.error.message } as unknown as AppError);
    }

    const events = storeResult.value.events;
    const buckets = aggregateEvents(events, { granularity });
    const metrics = computePlatformMetrics(buckets, events, windowHours);
    return ok(metrics);
  }

  async getTrustTrends(query: TrustTrendsQuery): Promise<Result<TrustTrendSeries, AppError>> {
    const { orgId, windowDays, bucketHours } = query;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const from = new Date(Date.now() - windowMs).toISOString();
    const q = analyticsQuery()
      .forOrganization(orgId)
      .from(from as never)
      .withLimit(1000)
      .build();

    const storeResult = this.#deps.analyticsStore.query(q);
    if (!isOk(storeResult)) {
      return err({ code: "INTERNAL", message: storeResult.error.message } as unknown as AppError);
    }

    const events = storeResult.value.events;
    const series = computeTrustTrends(events, { organizationId: orgId, windowDays, bucketHours });
    return ok(series);
  }

  async getAnalyticsReport(query: AnalyticsReportQuery): Promise<Result<AnalyticsReport, AppError>> {
    const { orgId, from, to, granularity } = query;
    const q = analyticsQuery()
      .forOrganization(orgId)
      .from(from as never)
      .to(to as never)
      .withLimit(1000)
      .build();

    const storeResult = this.#deps.analyticsStore.query(q);
    if (!isOk(storeResult)) {
      return err({ code: "INTERNAL", message: storeResult.error.message } as unknown as AppError);
    }

    const events = storeResult.value.events;
    const buckets = aggregateEvents(events, { granularity, filterOrganizationId: orgId });
    const kpis = computeVerificationKpis(buckets, 24);
    const engagement = computeEngagementKpis(buckets, events);
    const quality = computeQualityKpis(events);

    const series = [
      computeMetricSeries("verifications", "count",
        events
          .filter((e) => e.type === "verification.completed")
          .map((e) => ({ timestamp: e.occurredAt, value: 1 }))
      ),
      computeMetricSeries("api_requests", "count",
        events
          .filter((e) => e.type === "api.request")
          .map((e) => ({ timestamp: e.occurredAt, value: 1 }))
      ),
    ];

    const verdictCounts = quality.verdictDistribution;
    const report = makeAnalyticsReport({
      id: newId("report"),
      organizationId: orgId,
      period: { from, to, granularity },
      summary: {
        totalVerifications: kpis.totalVerifications,
        totalClaims: Object.values(verdictCounts).reduce((s, n) => s + n, 0),
        totalSources: 0,
        totalUsers: engagement.activeUsers,
        averageConfidence: quality.avgConfidence,
        averageProcessingMs: kpis.avgDurationMs,
        verdictDistribution: {
          true: verdictCounts["true"] ?? 0,
          false: verdictCounts["false"] ?? 0,
          unverifiable: verdictCounts["unverifiable"] ?? 0,
          disputed: verdictCounts["disputed"] ?? 0,
          total: Object.values(verdictCounts).reduce((s, n) => s + n, 0),
        },
      },
      series,
    });

    return ok(report);
  }

  queryEvents(query: EventsQuery): Result<AnalyticsQueryResult, AppError> {
    const eventNames = query.eventNames
      ? query.eventNames.split(",").map((n) => n.trim())
      : undefined;

    const q = analyticsQuery()
      .withLimit(query.limit)
      .withOffset(query.offset)
      .build();

    const built = {
      ...q,
      ...(query.orgId !== undefined ? { organizationId: query.orgId } : {}),
      ...(query.userId !== undefined ? { userId: query.userId } : {}),
      ...(query.from !== undefined ? { from: query.from as never } : {}),
      ...(query.to !== undefined ? { to: query.to as never } : {}),
      ...(eventNames !== undefined ? { eventNames } : {}),
    };

    const storeResult = this.#deps.analyticsStore.query(built);
    if (!isOk(storeResult)) {
      return err({ code: "INTERNAL", message: storeResult.error.message } as unknown as AppError);
    }
    return ok(storeResult.value);
  }

  async trackEvent(body: TrackEventBody): Promise<Result<void, AppError>> {
    const { type, organizationId, userId, properties, occurredAt, durationMs, success } = body;
    await this.#deps.tracker.track({
      type: type as AnalyticsEventType,
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      properties: properties ?? {},
      ...(occurredAt !== undefined ? { occurredAt: occurredAt as never } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(success !== undefined ? { success } : {}),
    });
    return ok(undefined);
  }
}
