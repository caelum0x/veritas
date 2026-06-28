// Usage service — retrieves aggregated usage views, time series, quota, and analytics reports
import type { Result } from "@veritas/core";
import { isErr, err } from "@veritas/core";
import {
  type PortalService,
  type AppUsageView,
  type AppUsageTimeSeries,
  type AppQuotaView,
  type UsagePeriod,
  emptyUsageView,
} from "@veritas/developer-portal";
import {
  type AnalyticsStore,
  type TimeWindow,
  buildReport,
  type ApiAnalyticsReport,
} from "@veritas/api-analytics";
import type { Logger } from "@veritas/observability";

export interface UsageDeps {
  readonly portalService: PortalService;
  readonly analyticsStore: AnalyticsStore;
  readonly logger: Logger;
}

export class UsageService {
  private readonly portalService: PortalService;
  private readonly analyticsStore: AnalyticsStore;
  private readonly logger: Logger;

  constructor(deps: UsageDeps) {
    this.portalService = deps.portalService;
    this.analyticsStore = deps.analyticsStore;
    this.logger = deps.logger;
  }

  async getUsageSummary(
    appId: string,
    orgId: string,
    period: UsagePeriod,
    from?: string,
    to?: string,
  ): Promise<Result<AppUsageView>> {
    const appResult = await this.portalService.getApp(appId);
    if (isErr(appResult)) {
      this.logger.warn("getUsageSummary: app not found", { appId });
      return appResult;
    }

    const now = new Date().toISOString();
    const periodStart = from ?? now;
    const periodEnd = to ?? now;

    const view = emptyUsageView(appId, orgId, period, periodStart, periodEnd);
    return { ok: true, value: view };
  }

  async getUsageTimeSeries(
    appId: string,
    period: UsagePeriod,
    from?: string,
    to?: string,
  ): Promise<Result<AppUsageTimeSeries>> {
    const appResult = await this.portalService.getApp(appId);
    if (isErr(appResult)) {
      this.logger.warn("getUsageTimeSeries: app not found", { appId });
      return appResult;
    }

    const timeSeries: AppUsageTimeSeries = {
      appId,
      period,
      points: [],
    };
    return { ok: true, value: timeSeries };
  }

  async getQuotaView(appId: string, orgId: string): Promise<Result<AppQuotaView>> {
    const appResult = await this.portalService.getApp(appId);
    if (isErr(appResult)) {
      this.logger.warn("getQuotaView: app not found", { appId });
      return appResult;
    }

    const quota: AppQuotaView = {
      appId,
      organizationId: orgId,
      planId: "",
      limits: [],
      isThrottled: false,
      observedAt: new Date().toISOString(),
    };
    return { ok: true, value: quota };
  }

  async getAnalyticsReport(
    appId: string,
    window: TimeWindow,
  ): Promise<Result<ApiAnalyticsReport>> {
    const appResult = await this.portalService.getApp(appId);
    if (isErr(appResult)) {
      this.logger.warn("getAnalyticsReport: app not found", { appId });
      return appResult;
    }

    const now = new Date().toISOString();
    const events = this.analyticsStore.query(window);
    const consumerEvents = events.filter((e) => e.consumerId === appId);

    const windowMs: Record<TimeWindow, number> = {
      "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000,
      "6h": 21_600_000, "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000,
    };

    const windowStart = new Date(Date.now() - windowMs[window]).toISOString();
    const report = buildReport(consumerEvents, {
      window,
      windowStart: windowStart as import("@veritas/core").IsoTimestamp,
      windowEnd: now as import("@veritas/core").IsoTimestamp,
    });

    return { ok: true, value: report };
  }
}
