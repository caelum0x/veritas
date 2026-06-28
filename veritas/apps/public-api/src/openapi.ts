// openapi.ts: static OpenAPI v3.1 specification document for the Veritas public REST API v1.
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Public API",
    version: "1.0.0",
    description:
      "Enterprise fact-verification and source-provenance platform — public REST API.",
    contact: { name: "Veritas Support", email: "support@veritas.ai" },
    license: { name: "Proprietary" },
  },
  servers: [{ url: "/v1", description: "Production v1" }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description: "API key issued via the Veritas dashboard.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
        },
      },
      ApiFailure: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
          error: { $ref: "#/components/schemas/Error" },
        },
      },
      PageMeta: {
        type: "object",
        required: ["hasMore"],
        properties: {
          hasMore: { type: "boolean" },
          nextCursor: { type: "string", nullable: true },
        },
      },
      JobStatus: {
        type: "string",
        enum: ["queued", "running", "succeeded", "failed", "cancelled"],
      },
      JobView: {
        type: "object",
        required: ["id", "status", "attempts", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          status: { $ref: "#/components/schemas/JobStatus" },
          verificationId: { type: "string", nullable: true },
          attempts: { type: "integer" },
          error: { type: "string", nullable: true },
          startedAt: { type: "string", format: "date-time", nullable: true },
          finishedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ReportView: {
        type: "object",
        required: ["id", "verificationId", "trustScore", "createdAt"],
        properties: {
          id: { type: "string" },
          verificationId: { type: "string" },
          contentHash: { type: "string", nullable: true },
          summary: { type: "string", nullable: true },
          trustScore: { type: "number", minimum: 0, maximum: 1 },
          counts: {
            type: "object",
            properties: {
              supported: { type: "integer" },
              refuted: { type: "integer" },
              unverifiable: { type: "integer" },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid API key.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiFailure" } } },
      },
      Forbidden: {
        description: "Insufficient permissions.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiFailure" } } },
      },
      NotFound: {
        description: "Resource not found.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiFailure" } } },
      },
      TooManyRequests: {
        description: "Rate limit exceeded.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiFailure" } } },
      },
      InternalError: {
        description: "Internal server error.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiFailure" } } },
      },
    },
  },
  paths: {
    "/verifications": {
      post: {
        operationId: "submitVerification",
        summary: "Submit a verification job",
        tags: ["Verification"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string", minLength: 1 },
                  claims: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
                  context: { type: "string" },
                  allowedDomains: { type: "array", items: { type: "string" } },
                  idempotencyKey: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Job accepted.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/JobView" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/NotFound" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      get: {
        operationId: "listVerifications",
        summary: "List verification jobs",
        tags: ["Verification"],
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/JobStatus" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated list of verification jobs.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { type: "array", items: { $ref: "#/components/schemas/JobView" } },
                    meta: { $ref: "#/components/schemas/PageMeta" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/verifications/{jobId}": {
      get: {
        operationId: "getVerification",
        summary: "Get a verification job by ID",
        tags: ["Verification"],
        parameters: [
          { name: "jobId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Job details.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/JobView" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        operationId: "cancelVerification",
        summary: "Cancel a pending verification job",
        tags: ["Verification"],
        parameters: [
          { name: "jobId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Job cancelled.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/JobView" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": {
            description: "Job is in a terminal state and cannot be cancelled.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiFailure" } } },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/reports": {
      get: {
        operationId: "listReports",
        summary: "List verification reports",
        tags: ["Reports"],
        parameters: [
          { name: "verificationId", in: "query", schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated list of reports.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { type: "array", items: { $ref: "#/components/schemas/ReportView" } },
                    meta: { $ref: "#/components/schemas/PageMeta" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/reports/{reportId}": {
      get: {
        operationId: "getReport",
        summary: "Get a report by ID",
        tags: ["Reports"],
        parameters: [
          { name: "reportId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Report details.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/ReportView" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/usage": {
      get: {
        operationId: "listUsage",
        summary: "List usage records for the authenticated organization",
        tags: ["Usage"],
        parameters: [
          { name: "metric", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          "200": { description: "Paginated usage records." },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/pricing/compute": {
      post: {
        operationId: "computePrice",
        summary: "Compute price for a metric quantity",
        tags: ["Pricing"],
        responses: {
          "200": { description: "Computed price." },
          "400": { $ref: "#/components/responses/NotFound" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
} as const;

export type OpenApiDocument = typeof openApiDocument;
