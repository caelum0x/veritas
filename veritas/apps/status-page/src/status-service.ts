// Orchestrates health checks, SLO summaries, incidents, and uptime into a status snapshot.
import type { HealthCheck, HealthSnapshot, HealthCheckResult } from "@veritas/health-aggregation";
import type { SloSummary } from "@veritas/slo";
import type { Clock } from "@veritas/core";
import { isOk } from "@veritas/core";
import type { IncidentFeedStore } from "./incidents-feed.js";
import type { TrackedComponent } from "./components.js";
import { TRACKED_COMPONENTS } from "./components.js";
import { calcUptimeAllWindows } from "./uptime.js";
import { renderStatusPage, type StatusPagePayload } from "./render.js";
import type { StatusPageConfig } from "./config.js";

/** Port interface for SLO summary retrieval. */
export interface SloSummarySource {
  listSummaries(): Promise<readonly SloSummary[]>;
}

/** Port interface for health history retrieval (used for uptime). */
export interface HealthHistorySource {
  getHistory(checkName: string): Promise<readonly import("@veritas/health-aggregation").HealthHistoryEntry[]>;
}

export interface StatusServiceDeps {
  readonly checks: readonly HealthCheck[];
  readonly incidentStore: IncidentFeedStore;
  readonly sloSource: SloSummarySource;
  readonly historySource: HealthHistorySource;
  readonly clock: Clock;
  readonly config: StatusPageConfig;
  readonly tracked?: readonly TrackedComponent[];
}

/** Run all health checks in parallel and aggregate into a HealthSnapshot. */
async function runChecks(
  checks: readonly HealthCheck[],
  version: string,
): Promise<HealthSnapshot> {
  const nowIso = new Date().toISOString();
  if (checks.length === 0) {
    return { status: "healthy", checks: [], timestamp: nowIso, version };
  }
  const settled = await Promise.allSettled(checks.map((c) => c.execute()));
  const results: HealthCheckResult[] = settled.map((s, i): HealthCheckResult => {
    if (s.status === "fulfilled" && isOk(s.value)) {
      return s.value.value;
    }
    const reason = s.status === "rejected" ? String(s.reason) : "unknown error";
    return {
      name: checks[i]!.name,
      status: "unhealthy",
      latencyMs: 0,
      checkedAt: nowIso,
      error: reason,
      metadata: {},
    };
  });
  const anyUnhealthy = results.some((r) => r.status === "unhealthy");
  const anyDegraded = results.some((r) => r.status === "degraded");
  const overallStatus = anyUnhealthy ? "unhealthy" : anyDegraded ? "degraded" : "healthy";
  return { status: overallStatus, checks: results, timestamp: nowIso, version };
}

/** Computes the full public status page payload on demand. */
export class StatusService {
  private readonly checks: readonly HealthCheck[];
  private readonly incidentStore: IncidentFeedStore;
  private readonly sloSource: SloSummarySource;
  private readonly historySource: HealthHistorySource;
  private readonly clock: Clock;
  private readonly config: StatusPageConfig;
  private readonly tracked: readonly TrackedComponent[];

  constructor(deps: StatusServiceDeps) {
    this.checks = deps.checks;
    this.incidentStore = deps.incidentStore;
    this.sloSource = deps.sloSource;
    this.historySource = deps.historySource;
    this.clock = deps.clock;
    this.config = deps.config;
    this.tracked = deps.tracked ?? TRACKED_COMPONENTS;
  }

  async getStatus(): Promise<StatusPagePayload> {
    const now = this.clock.nowIso();
    const nowMs = new Date(now).getTime();

    const [snapshot, activeIncidents, recentIncidents, sloSummaries] =
      await Promise.all([
        runChecks([...this.checks], this.config.version),
        this.incidentStore.active(),
        this.incidentStore.list(this.config.maxIncidents),
        this.sloSource.listSummaries(),
      ]);

    const uptimeByComponent = new Map<string, readonly import("./uptime.js").UptimeResult[]>();
    await Promise.all(
      this.tracked.map(async (tc) => {
        const history = await this.historySource.getHistory(tc.healthCheckName);
        const results = calcUptimeAllWindows(tc.id, tc.healthCheckName, history, nowMs);
        uptimeByComponent.set(tc.id, results);
      }),
    );

    return renderStatusPage({
      tracked: this.tracked,
      snapshot,
      activeIncidents,
      recentIncidents,
      sloSummaries,
      uptimeByComponent,
      version: this.config.version,
      now,
    });
  }
}
