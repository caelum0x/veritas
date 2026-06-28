// Tracked system components exposed on the public status page.
import { z } from "zod";

export const ComponentGroupSchema = z.enum([
  "core",
  "data",
  "infra",
  "integrations",
]);
export type ComponentGroup = z.infer<typeof ComponentGroupSchema>;

export const ComponentStatusSchema = z.enum([
  "operational",
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
]);
export type ComponentStatus = z.infer<typeof ComponentStatusSchema>;

export const TrackedComponentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  group: ComponentGroupSchema,
  /** Maps to the health-check name used in @veritas/health-aggregation. */
  healthCheckName: z.string(),
  /** If true, outage of this component triggers page-level operational status. */
  critical: z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0),
});
export type TrackedComponent = z.infer<typeof TrackedComponentSchema>;

/** Static registry of all components tracked by the status page. */
export const TRACKED_COMPONENTS: readonly TrackedComponent[] = Object.freeze([
  {
    id: "api",
    name: "Public API",
    description: "REST API serving fact-verification requests.",
    group: "core",
    healthCheckName: "api",
    critical: true,
    displayOrder: 0,
  },
  {
    id: "verification-engine",
    name: "Verification Engine",
    description: "Core claim analysis and verdict pipeline.",
    group: "core",
    healthCheckName: "verification",
    critical: true,
    displayOrder: 1,
  },
  {
    id: "ingestion",
    name: "Ingestion Worker",
    description: "Claim and document ingestion pipeline.",
    group: "data",
    healthCheckName: "ingestion",
    critical: false,
    displayOrder: 2,
  },
  {
    id: "search",
    name: "Search Index",
    description: "Full-text and semantic search service.",
    group: "data",
    healthCheckName: "search",
    critical: false,
    displayOrder: 3,
  },
  {
    id: "database",
    name: "Database",
    description: "Primary relational data store.",
    group: "infra",
    healthCheckName: "database",
    critical: true,
    displayOrder: 4,
  },
  {
    id: "messaging",
    name: "Messaging",
    description: "Event bus and message queue.",
    group: "infra",
    healthCheckName: "messaging",
    critical: false,
    displayOrder: 5,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Outbound webhook delivery service.",
    group: "integrations",
    healthCheckName: "webhooks",
    critical: false,
    displayOrder: 6,
  },
]);

/** Map health-aggregation HealthStatus to public ComponentStatus. */
export function toComponentStatus(
  healthStatus: "healthy" | "degraded" | "unhealthy",
): ComponentStatus {
  switch (healthStatus) {
    case "healthy":
      return "operational";
    case "degraded":
      return "degraded_performance";
    case "unhealthy":
      return "major_outage";
  }
}
