// OpenAPI specification document for billing-api v1.

export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Billing API",
    version: "1.0.0",
    description:
      "Enterprise billing, usage metering, invoicing, payments, tax, and revenue management.",
    contact: { name: "Veritas Platform", email: "platform@veritas.dev" },
  },
  servers: [{ url: "/v1", description: "Billing API v1" }],
  components: {
    securitySchemes: {
      ApiKey: {
        type: "http",
        scheme: "bearer",
        description: "Veritas API key: Bearer veritas_sk_<keyId>_<secret>",
      },
    },
    schemas: {
      Problem: {
        type: "object",
        required: ["type", "title", "status", "detail"],
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          instance: { type: "string" },
        },
      },
    },
  },
  security: [{ ApiKey: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Liveness probe",
        operationId: "getLiveness",
        security: [],
        responses: { "200": { description: "Service is alive" } },
      },
    },
    "/health/ready": {
      get: {
        summary: "Readiness probe",
        operationId: "getReadiness",
        security: [],
        responses: {
          "200": { description: "Service is ready" },
          "503": { description: "Service unavailable" },
        },
      },
    },
  },
} as const;
