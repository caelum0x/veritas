// OpenAPI 3.1 document builder: assembles the full specification for the Veritas API.
import { buildComponents } from "./components.js";

// Inline type for OpenAPI 3.1 document to avoid openapi-types dependency
type OpenApiDocument = Record<string, unknown>;

export function buildOpenApiSpec(
  version: string,
  serverUrl: string
): OpenApiDocument {
  return {
    openapi: "3.1.0",
    info: {
      title: "Veritas Fact-Verification API",
      version,
      description:
        "Production fact-verification & source-provenance platform. " +
        "Exposes the verification engine as a REST API consumable by agents, " +
        "platforms, and end-users. Payments settle in USDC on Base.",
      contact: {
        name: "Veritas Support",
        url: "https://veritas.croo.ai/support",
        email: "support@croo.ai",
      },
      license: {
        name: "Proprietary",
      },
    },
    servers: [
      {
        url: serverUrl,
        description: "Current environment",
      },
    ],
    security: [{ ApiKeyAuth: [] }],
    components: buildComponents(),
    paths: {
      "/v1/health": {
        get: {
          operationId: "getHealth",
          summary: "Health check",
          tags: ["Health"],
          security: [],
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
          },
        },
      },
      "/v1/me": {
        get: {
          operationId: "getMe",
          summary: "Get authenticated caller profile",
          tags: ["Me"],
          responses: {
            "200": {
              description: "Authenticated user",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccess" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/verification-jobs": {
        get: {
          operationId: "listVerificationJobs",
          summary: "List verification jobs",
          tags: ["Verification"],
          parameters: [{ $ref: "#/components/parameters/PageParam" }],
          responses: {
            "200": {
              description: "Paginated list of verification jobs",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiPage" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        post: {
          operationId: "createVerificationJob",
          summary: "Submit a new verification job",
          tags: ["Verification"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateJobRequest" },
              },
            },
          },
          responses: {
            "202": {
              description: "Job accepted",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccess" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/v1/verification-jobs/{jobId}": {
        get: {
          operationId: "getVerificationJob",
          summary: "Get a verification job by ID",
          tags: ["Verification"],
          parameters: [{ $ref: "#/components/parameters/JobIdParam" }],
          responses: {
            "200": {
              description: "Verification job",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccess" },
                },
              },
            },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/v1/reports": {
        get: {
          operationId: "listReports",
          summary: "List verification reports",
          tags: ["Reports"],
          parameters: [{ $ref: "#/components/parameters/PageParam" }],
          responses: {
            "200": {
              description: "Paginated list of reports",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiPage" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/reports/{reportId}": {
        get: {
          operationId: "getReport",
          summary: "Get a verification report by ID",
          tags: ["Reports"],
          parameters: [{ $ref: "#/components/parameters/ReportIdParam" }],
          responses: {
            "200": {
              description: "Verification report",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccess" },
                },
              },
            },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/v1/orders": {
        get: {
          operationId: "listOrders",
          summary: "List orders",
          tags: ["Orders"],
          parameters: [{ $ref: "#/components/parameters/PageParam" }],
          responses: {
            "200": {
              description: "Paginated list of orders",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiPage" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        post: {
          operationId: "createOrder",
          summary: "Create an order",
          tags: ["Orders"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateOrderRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Order created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccess" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/wallets": {
        get: {
          operationId: "listWallets",
          summary: "List wallets",
          tags: ["Wallets"],
          responses: {
            "200": {
              description: "List of wallets",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiPage" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/settlements": {
        get: {
          operationId: "listSettlements",
          summary: "List settlements",
          tags: ["Settlements"],
          parameters: [{ $ref: "#/components/parameters/PageParam" }],
          responses: {
            "200": {
              description: "Paginated list of settlements",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiPage" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
    },
  };
}
