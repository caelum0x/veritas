// Minimal OpenAPI 3.1 spec document served at GET /openapi.json.

import type { AppConfig } from "./config.js";

/** Build the OpenAPI 3.1 specification for the agent-gateway. */
export function buildOpenApiSpec(config: AppConfig): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: config.agentName,
      version: config.agentVersion,
      description:
        "Veritas Agent Gateway — A2A protocol endpoint, agent card discovery, and task management.",
    },
    servers: [{ url: config.agentBaseUrl, description: "This server" }],
    components: {
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          in: "header",
          name: config.apiKeyHeader,
        },
      },
    },
    security: [{ apiKey: [] }],
    paths: {
      "/health": {
        get: {
          operationId: "getHealth",
          summary: "Aggregate health report",
          security: [],
          responses: {
            "200": { description: "All components healthy or degraded" },
            "503": { description: "One or more components unhealthy" },
          },
        },
      },
      "/health/live": {
        get: {
          operationId: "getLiveness",
          summary: "Liveness probe",
          security: [],
          responses: { "200": { description: "Process is alive" } },
        },
      },
      "/health/ready": {
        get: {
          operationId: "getReadiness",
          summary: "Readiness probe",
          security: [],
          responses: {
            "200": { description: "Service is ready" },
            "503": { description: "Service is not ready" },
          },
        },
      },
      "/agent-card": {
        get: {
          operationId: "getAgentCard",
          summary: "Retrieve the Veritas agent card",
          security: [],
          responses: { "200": { description: "Agent card JSON" } },
        },
      },
      "/a2a/tasks": {
        post: {
          operationId: "createA2ATask",
          summary: "Submit a new A2A verification task",
          responses: {
            "201": { description: "Task created" },
            "400": { description: "Bad request" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/a2a/tasks/{taskId}": {
        get: {
          operationId: "getA2ATask",
          summary: "Retrieve an A2A task by ID",
          parameters: [
            { name: "taskId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Task details" },
            "404": { description: "Task not found" },
          },
        },
      },
      "/tasks": {
        get: {
          operationId: "listTasks",
          summary: "List all tasks",
          responses: { "200": { description: "Paginated task list" } },
        },
        post: {
          operationId: "createTask",
          summary: "Create a verification task",
          responses: {
            "201": { description: "Task created" },
            "400": { description: "Bad request" },
          },
        },
      },
    },
  };
}
