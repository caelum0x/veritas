// OpenAPI 3.1 document factory for @veritas/ops-api.
import type { Request, Response } from "express";

const OPENAPI_DOC = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Ops API",
    version: "1.0.0",
    description: "Operational platform API: incident management, SLO tracking, cost, and capacity.",
  },
  servers: [{ url: "/ops/v1", description: "Default" }],
  tags: [
    { name: "incidents", description: "Incident lifecycle management" },
    { name: "slo", description: "Service Level Objectives" },
    { name: "cost", description: "Cost tracking and budget management" },
    { name: "capacity", description: "Capacity planning and forecasting" },
    { name: "health", description: "Health probes" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["health"],
        summary: "Aggregate health report",
        operationId: "getHealth",
        responses: {
          "200": { description: "All components healthy" },
          "503": { description: "One or more components unhealthy" },
        },
      },
    },
    "/incidents": {
      get: {
        tags: ["incidents"],
        summary: "List incidents",
        operationId: "listIncidents",
        responses: { "200": { description: "Paginated list of incidents" } },
      },
      post: {
        tags: ["incidents"],
        summary: "Create incident",
        operationId: "createIncident",
        responses: { "201": { description: "Incident created" } },
      },
    },
    "/slos": {
      get: {
        tags: ["slo"],
        summary: "List SLOs",
        operationId: "listSlos",
        responses: { "200": { description: "List of SLOs" } },
      },
    },
    "/cost/budgets": {
      get: {
        tags: ["cost"],
        summary: "List budgets",
        operationId: "listBudgets",
        responses: { "200": { description: "List of budgets" } },
      },
    },
    "/capacity/resources": {
      get: {
        tags: ["capacity"],
        summary: "List capacity resources",
        operationId: "listCapacityResources",
        responses: { "200": { description: "List of resources" } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "ApiKey",
        description: "Veritas API key (veritas_sk_...)",
      },
    },
  },
  security: [{ ApiKey: [] }],
} as const;

/** Serve the OpenAPI specification document as JSON. */
export function handleOpenApiDoc(_req: Request, res: Response): void {
  res.status(200).json(OPENAPI_DOC);
}
