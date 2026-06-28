// OpenAPI 3.1 specification document for the mock-api-server admin API.
import type { Router, Request, Response } from "express";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Mock API Server",
    version: "1.0.0",
    description:
      "Admin API for managing mock HTTP definitions, scenarios, and call history.",
  },
  paths: {
    "/_mock/mocks": {
      get: {
        operationId: "listMocks",
        summary: "List all registered mock definitions",
        responses: {
          "200": { description: "Array of mock definitions" },
        },
      },
      post: {
        operationId: "createMock",
        summary: "Register a new mock definition",
        responses: {
          "201": { description: "Created mock definition" },
          "400": { description: "Validation error" },
          "409": { description: "Conflict: mock ID already exists" },
        },
      },
    },
    "/_mock/mocks/{id}": {
      get: {
        operationId: "getMock",
        summary: "Get a mock definition by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Mock definition" },
          "404": { description: "Not found" },
        },
      },
      put: {
        operationId: "updateMock",
        summary: "Replace a mock definition",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Updated mock definition" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        operationId: "deleteMock",
        summary: "Remove a mock definition",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Deleted" },
        },
      },
    },
    "/_mock/scenarios": {
      get: {
        operationId: "listScenarios",
        summary: "List all scenarios",
        responses: { "200": { description: "Array of scenarios" } },
      },
      post: {
        operationId: "createScenario",
        summary: "Register a new scenario",
        responses: {
          "201": { description: "Created scenario" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/_mock/scenarios/{id}/activate": {
      post: {
        operationId: "activateScenario",
        summary: "Activate a scenario",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Activated scenario" },
          "404": { description: "Not found" },
        },
      },
    },
    "/_mock/scenarios/{id}/deactivate": {
      post: {
        operationId: "deactivateScenario",
        summary: "Deactivate a scenario",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deactivated scenario" },
          "404": { description: "Not found" },
        },
      },
    },
    "/_mock/reset": {
      post: {
        operationId: "resetCallCounts",
        summary: "Reset all mock call counts",
        responses: { "200": { description: "Reset successful" } },
      },
    },
    "/health": {
      get: {
        operationId: "healthCheck",
        summary: "Aggregate health report",
        responses: {
          "200": { description: "Healthy" },
          "503": { description: "Unhealthy" },
        },
      },
    },
  },
};

export function registerOpenApiRoute(router: Router): void {
  router.get("/_mock/openapi.json", (_req: Request, res: Response): void => {
    res.json(spec);
  });
}
