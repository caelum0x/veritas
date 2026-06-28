// OpenAPI 3.1 specification document for the privacy-api.

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Privacy API",
    version: "1.0.0",
    description: "GDPR/CCPA compliance: DSR lifecycle, consent capture, and retention management.",
    contact: { name: "Veritas Platform", url: "https://veritas.io" },
  },
  servers: [{ url: "/v1", description: "Current version" }],
  components: {
    securitySchemes: {
      ApiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "ApiKey",
        description: "Veritas API key in `veritas_sk_<keyId>_<secret>` format.",
      },
    },
    schemas: {
      Problem: {
        type: "object",
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          instance: { type: "string" },
        },
        required: ["type", "title", "status", "detail"],
      },
    },
  },
  security: [{ ApiKey: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        operationId: "getHealth",
        security: [],
        responses: {
          200: { description: "Service healthy" },
          503: { description: "Service unhealthy" },
        },
      },
    },
    "/v1/dsrs": {
      post: {
        summary: "Submit a Data Subject Request",
        operationId: "createDsr",
        tags: ["DSR"],
        responses: {
          201: { description: "DSR created" },
          400: { $ref: "#/components/schemas/Problem" },
          401: { $ref: "#/components/schemas/Problem" },
        },
      },
      get: {
        summary: "List DSRs for a subject",
        operationId: "listDsrs",
        tags: ["DSR"],
        responses: {
          200: { description: "DSR list" },
        },
      },
    },
    "/v1/dsrs/{id}": {
      get: {
        summary: "Get a DSR by ID",
        operationId: "getDsr",
        tags: ["DSR"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "DSR found" },
          404: { $ref: "#/components/schemas/Problem" },
        },
      },
    },
    "/v1/consents": {
      post: {
        summary: "Capture a consent record",
        operationId: "captureConsent",
        tags: ["Consent"],
        responses: {
          201: { description: "Consent captured" },
          400: { $ref: "#/components/schemas/Problem" },
        },
      },
      get: {
        summary: "List consents for a user",
        operationId: "listConsents",
        tags: ["Consent"],
        responses: {
          200: { description: "Consent list" },
        },
      },
    },
    "/v1/retention/policies": {
      get: {
        summary: "List retention policies",
        operationId: "listRetentionPolicies",
        tags: ["Retention"],
        responses: {
          200: { description: "Policy list" },
        },
      },
    },
  },
} as const;
