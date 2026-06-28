// OpenAPI spec generation — returns a minimal spec document for the analytics-api.
import type { Request, Response } from "express";

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Analytics API",
    version: "1.0.0",
    description: "Enterprise fact-verification analytics, reporting, dashboards, and metrics.",
  },
  servers: [{ url: "/v1", description: "Current version" }],
  paths: {
    "/queries/execute": { post: { summary: "Execute an ad-hoc analytics query", tags: ["Queries"] } },
    "/queries/parse": { post: { summary: "Parse and validate a query string", tags: ["Queries"] } },
    "/reports": {
      get: { summary: "List reports", tags: ["Reports"] },
      post: { summary: "Generate a new report", tags: ["Reports"] },
    },
    "/reports/{id}": {
      get: { summary: "Get a report by ID", tags: ["Reports"] },
      delete: { summary: "Delete a report", tags: ["Reports"] },
    },
    "/dashboards": {
      get: { summary: "List dashboards", tags: ["Dashboards"] },
      post: { summary: "Create a dashboard", tags: ["Dashboards"] },
    },
    "/dashboards/{id}": {
      get: { summary: "Get a dashboard by ID", tags: ["Dashboards"] },
      patch: { summary: "Update a dashboard", tags: ["Dashboards"] },
      delete: { summary: "Delete a dashboard", tags: ["Dashboards"] },
    },
    "/metrics/platform": { get: { summary: "Get platform-level KPI metrics", tags: ["Metrics"] } },
    "/metrics/verification": { get: { summary: "Get verification KPIs", tags: ["Metrics"] } },
    "/metrics/engagement": { get: { summary: "Get engagement KPIs", tags: ["Metrics"] } },
    "/health": { get: { summary: "Service health check", tags: ["System"] } },
  },
  components: {
    securitySchemes: {
      ApiKey: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ ApiKey: [] }],
} as const;

/** Express handler that returns the OpenAPI spec as JSON. */
export function openApiHandler(_req: Request, res: Response): void {
  res.json(SPEC);
}
