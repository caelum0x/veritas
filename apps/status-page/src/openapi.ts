// Minimal OpenAPI 3.1 spec for the status-page HTTP API.
import type { Request, Response, Router } from "express";

const openApiSpec = Object.freeze({
  openapi: "3.1.0",
  info: {
    title: "Veritas Status Page API",
    version: "1.0.0",
    description: "Public status, incident tracking, and SLO uptime reporting API.",
  },
  servers: [{ url: "/api/v1", description: "Current server" }],
  tags: [
    { name: "status", description: "System status and health aggregation" },
    { name: "incidents", description: "Incident management and lifecycle" },
    { name: "uptime", description: "SLO compliance and uptime metrics" },
  ],
  paths: {
    "/status": {
      get: {
        tags: ["status"],
        summary: "Get aggregate system status",
        operationId: "getStatus",
        responses: {
          "200": { description: "Aggregate health snapshot" },
        },
      },
    },
    "/incidents": {
      get: {
        tags: ["incidents"],
        summary: "List incidents",
        operationId: "listIncidents",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "severity", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Paginated incident list" },
        },
      },
      post: {
        tags: ["incidents"],
        summary: "Create incident",
        operationId: "createIncident",
        responses: {
          "201": { description: "Created incident" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/incidents/{id}": {
      get: {
        tags: ["incidents"],
        summary: "Get incident by ID",
        operationId: "getIncident",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Incident detail" },
          "404": { description: "Incident not found" },
        },
      },
    },
    "/uptime": {
      get: {
        tags: ["uptime"],
        summary: "List SLO uptime reports",
        operationId: "listSloReports",
        responses: {
          "200": { description: "SLO reports list" },
        },
      },
    },
    "/uptime/{sloId}": {
      get: {
        tags: ["uptime"],
        summary: "Get SLO uptime for a specific SLO",
        operationId: "getSloUptime",
        parameters: [{ name: "sloId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "SLO uptime detail" },
          "404": { description: "SLO not found" },
        },
      },
    },
  },
} as const);

export function mountOpenApiRoutes(router: Router): void {
  router.get("/openapi.json", (_req: Request, res: Response) => {
    res.status(200).json(openApiSpec);
  });
}
