// Verification analytics flow: load verification reports → store events in analytics warehouse.
import { ok, err, isOk, type Result } from "@veritas/core";
import { makeAnalyticsReport, type AnalyticsReport } from "@veritas/analytics";
import type { IsoTimestamp } from "@veritas/core";
import { VerificationAnalyticsFlowError } from "./errors.js";
import { makeVerificationAnalyticsStoredEvent } from "./events.js";
import type { VerificationAnalyticsFlowDeps } from "./deps.js";

export interface VerificationAnalyticsInput {
  readonly organizationId: string;
  readonly from: string;
  readonly to: string;
  readonly granularity?: "hour" | "day" | "week" | "month";
}

export interface VerificationAnalyticsOutput {
  readonly reportId: string;
  readonly eventCount: number;
  readonly organizationId: string;
}

export class VerificationAnalyticsFlow {
  constructor(private readonly deps: VerificationAnalyticsFlowDeps) {}

  async run(
    input: VerificationAnalyticsInput,
  ): Promise<Result<VerificationAnalyticsOutput, VerificationAnalyticsFlowError>> {
    const { reportStore, analyticsStore, logger, eventBus } = this.deps;
    const granularity = input.granularity ?? "day";

    logger.info("verification-analytics-flow: starting", {
      organizationId: input.organizationId,
      from: input.from,
      to: input.to,
    });

    const listResult = await reportStore.list({
      organizationId: input.organizationId,
      status: "ready",
      page: 1,
      pageSize: 1000,
    });

    if (!isOk(listResult)) {
      return err(
        new VerificationAnalyticsFlowError({
          message: `Failed to list reports: ${listResult.error.message}`,
          cause: listResult.error,
        }),
      );
    }

    const reports = listResult.value.items;
    let eventCount = 0;

    for (const report of reports) {
      const generatedAt = report.generatedAt ?? report.createdAt;
      const ts = new Date(generatedAt).getTime();
      const fromTs = new Date(input.from).getTime();
      const toTs = new Date(input.to).getTime();
      if (ts < fromTs || ts > toTs) continue;

      const analyticsEvent = {
        id: `ae-${report.id}`,
        type: "report.generated" as const,
        occurredAt: (report.generatedAt ?? report.createdAt) as IsoTimestamp,
        organizationId: report.organizationId,
        entityId: report.id,
        entityType: "report",
        properties: {
          format: report.format,
          status: report.status,
          ownerId: report.ownerId,
        },
      };

      const insertResult = analyticsStore.insert(analyticsEvent);
      if (!isOk(insertResult)) {
        logger.warn("verification-analytics-flow: insert failed", { reportId: report.id, error: insertResult.error.message });
        continue;
      }

      eventCount++;
    }

    const analyticsReport: AnalyticsReport = makeAnalyticsReport({
      id: `ar-${input.organizationId}-${Date.now()}`,
      organizationId: input.organizationId,
      period: { from: input.from, to: input.to, granularity },
      summary: {
        totalVerifications: eventCount,
        totalClaims: 0,
        totalSources: 0,
        totalUsers: 0,
        averageConfidence: 0,
        averageProcessingMs: 0,
        verdictDistribution: { true: 0, false: 0, unverifiable: 0, disputed: 0, total: 0 },
      },
      series: [],
    });

    logger.info("verification-analytics-flow: completed", {
      reportId: analyticsReport.id,
      eventCount,
    });

    await eventBus.publish(
      makeVerificationAnalyticsStoredEvent({ reportId: analyticsReport.id, eventCount }),
    );

    return ok({
      reportId: analyticsReport.id,
      eventCount,
      organizationId: input.organizationId,
    });
  }
}
