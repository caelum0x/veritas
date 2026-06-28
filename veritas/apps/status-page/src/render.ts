// Renders the aggregate status page payload as a JSON-serialisable object.
import type { HealthSnapshot } from "@veritas/health-aggregation";
import type { SloSummary } from "@veritas/slo";
import type { TrackedComponent, ComponentStatus } from "./components.js";
import { toComponentStatus } from "./components.js";
import type { PublicIncident } from "./incidents-feed.js";
import type { UptimeResult } from "./uptime.js";

export interface ComponentStatusEntry {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly status: ComponentStatus;
  readonly description: string;
  readonly uptime: readonly UptimeResult[];
}

export interface StatusPagePayload {
  readonly pageStatus: ComponentStatus;
  readonly components: readonly ComponentStatusEntry[];
  readonly activeIncidents: readonly PublicIncident[];
  readonly recentIncidents: readonly PublicIncident[];
  readonly sloSummaries: readonly SloSummary[];
  readonly generatedAt: string;
  readonly version: string;
}

/** Derive page-level status: worst of all critical component statuses. */
function derivePageStatus(
  components: readonly ComponentStatusEntry[],
  criticalIds: ReadonlySet<string>,
): ComponentStatus {
  const critical = components.filter((c) => criticalIds.has(c.id));
  if (critical.some((c) => c.status === "major_outage")) return "major_outage";
  if (critical.some((c) => c.status === "partial_outage")) return "partial_outage";
  if (components.some((c) => c.status === "degraded_performance")) return "degraded_performance";
  if (components.some((c) => c.status === "under_maintenance")) return "under_maintenance";
  return "operational";
}

export interface RenderInput {
  readonly tracked: readonly TrackedComponent[];
  readonly snapshot: HealthSnapshot;
  readonly activeIncidents: readonly PublicIncident[];
  readonly recentIncidents: readonly PublicIncident[];
  readonly sloSummaries: readonly SloSummary[];
  readonly uptimeByComponent: ReadonlyMap<string, readonly UptimeResult[]>;
  readonly version: string;
  readonly now: string;
}

/** Build the full status page payload from aggregated data. */
export function renderStatusPage(input: RenderInput): StatusPagePayload {
  const {
    tracked,
    snapshot,
    activeIncidents,
    recentIncidents,
    sloSummaries,
    uptimeByComponent,
    version,
    now,
  } = input;

  const checkMap = new Map(snapshot.checks.map((c) => [c.name, c]));

  const components: readonly ComponentStatusEntry[] = tracked.map((tc) => {
    const check = checkMap.get(tc.healthCheckName);
    const healthStatus = check?.status ?? "unhealthy";
    return Object.freeze({
      id: tc.id,
      name: tc.name,
      group: tc.group,
      description: tc.description,
      status: toComponentStatus(healthStatus),
      uptime: uptimeByComponent.get(tc.id) ?? [],
    });
  });

  const criticalIds = new Set(tracked.filter((t) => t.critical).map((t) => t.id));
  const pageStatus = derivePageStatus(components, criticalIds);

  return Object.freeze({
    pageStatus,
    components,
    activeIncidents,
    recentIncidents,
    sloSummaries,
    generatedAt: now,
    version,
  });
}
