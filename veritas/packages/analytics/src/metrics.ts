// Derived KPI computation from aggregated time-bucket data
import { Score, clampScore, meanScore } from "@veritas/core";
import { TimeBucket } from "./aggregator.js";
import { AnalyticsEvent } from "./event.js";

export interface VerificationKpis {
  totalVerifications: number;
  successRate: Score;
  avgDurationMs: number;
  throughputPerHour: number;
}

export interface EngagementKpis {
  totalApiRequests: number;
  uniqueOrganizations: number;
  activeUsers: number;
  reportsGenerated: number;
}

export interface QualityKpis {
  verdictDistribution: Record<string, number>;
  avgConfidence: Score;
  sourceUtilizationRate: Score;
}

export interface PlatformMetrics {
  verification: VerificationKpis;
  engagement: EngagementKpis;
  quality: QualityKpis;
}

export function computeVerificationKpis(
  buckets: readonly TimeBucket[],
  windowHours: number
): VerificationKpis {
  const verificationBuckets = buckets.filter(
    (b) =>
      b.eventType === "verification.completed" ||
      b.eventType === "verification.started" ||
      b.eventType === "verification.failed"
  );
  const completedBuckets = buckets.filter((b) => b.eventType === "verification.completed");

  const totalVerifications = completedBuckets.reduce((s, b) => s + b.count, 0);
  const totalSuccess = completedBuckets.reduce((s, b) => s + b.successCount, 0);
  const totalDuration = completedBuckets.reduce((s, b) => s + b.totalDurationMs, 0);

  const successRate = clampScore(
    totalVerifications > 0 ? totalSuccess / totalVerifications : 0
  );

  const avgDurationMs = totalVerifications > 0 ? totalDuration / totalVerifications : 0;

  const throughputPerHour =
    windowHours > 0 ? totalVerifications / windowHours : totalVerifications;

  void verificationBuckets;

  return { totalVerifications, successRate, avgDurationMs, throughputPerHour };
}

export function computeEngagementKpis(
  buckets: readonly TimeBucket[],
  events: readonly AnalyticsEvent[]
): EngagementKpis {
  const apiRequestBuckets = buckets.filter((b) => b.eventType === "api.request");
  const totalApiRequests = apiRequestBuckets.reduce((s, b) => s + b.count, 0);

  const orgIds = new Set(events.map((e) => e.organizationId).filter(Boolean));
  const userIds = new Set(events.map((e) => e.userId).filter(Boolean));
  const reportBuckets = buckets.filter((b) => b.eventType === "report.generated");
  const reportsGenerated = reportBuckets.reduce((s, b) => s + b.count, 0);

  return {
    totalApiRequests,
    uniqueOrganizations: orgIds.size,
    activeUsers: userIds.size,
    reportsGenerated,
  };
}

export function computeQualityKpis(events: readonly AnalyticsEvent[]): QualityKpis {
  const verdictDistribution: Record<string, number> = {};
  const confidenceScores: Score[] = [];

  for (const ev of events) {
    if (ev.type === "claim.verified" || ev.type === "claim.rejected") {
      const verdict = ev.properties["verdict"];
      if (typeof verdict === "string") {
        verdictDistribution[verdict] = (verdictDistribution[verdict] ?? 0) + 1;
      }
      const confidence = ev.properties["confidence"];
      if (typeof confidence === "number") {
        confidenceScores.push(clampScore(confidence));
      }
    }
  }

  const totalClaims = Object.values(verdictDistribution).reduce((s, n) => s + n, 0);
  const sourcedClaims = events.filter(
    (e) => e.type === "claim.verified" && Array.isArray(e.properties["sources"])
  ).length;
  const sourceUtilizationRate = clampScore(
    totalClaims > 0 ? sourcedClaims / totalClaims : 0
  );

  const avgConfidence = confidenceScores.length > 0 ? meanScore(confidenceScores) : clampScore(0);

  return { verdictDistribution, avgConfidence, sourceUtilizationRate };
}

export function computePlatformMetrics(
  buckets: readonly TimeBucket[],
  events: readonly AnalyticsEvent[],
  windowHours: number
): PlatformMetrics {
  return {
    verification: computeVerificationKpis(buckets, windowHours),
    engagement: computeEngagementKpis(buckets, events),
    quality: computeQualityKpis(events),
  };
}
