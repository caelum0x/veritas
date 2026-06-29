// Admin API OpenAPI 3.1 specification builder — returns the full spec object.

export interface OpenApiSpec {
  readonly openapi: string;
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly servers: ReadonlyArray<{ readonly url: string; readonly description: string }>;
  readonly components: Record<string, unknown>;
  readonly paths: Record<string, unknown>;
}

const errorSchema = {
  type: "object",
  required: ["success", "error"],
  properties: {
    success: { type: "boolean", enum: [false] },
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "object", additionalProperties: true },
      },
    },
  },
} as const;

const bearerAuth = { type: "http", scheme: "bearer", bearerFormat: "JWT" } as const;

const commonResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  403: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  404: { description: "Not Found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  422: { description: "Validation Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
};

function idParam(name = "id") {
  return [{ name, in: "path", required: true, schema: { type: "string" } }];
}

export function buildOpenApiSpec(baseUrl = "http://localhost:4001"): OpenApiSpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "Veritas Admin API",
      version: "1.0.0",
      description: "Internal administration surface for Veritas: tenants, users, roles, plans, agents, and audit logs.",
    },
    servers: [
      { url: baseUrl, description: "Local development" },
    ],
    components: {
      securitySchemes: { bearerAuth },
      schemas: { Error: errorSchema },
    },
    paths: {
      "/health": {
        get: { summary: "Liveness probe", responses: { 200: { description: "Service is up" } } },
      },
      "/health/ready": {
        get: { summary: "Readiness probe", responses: { 200: { description: "Service is ready" }, 503: { description: "Service not ready" } } },
      },
      "/api/v1/tenants": {
        get: { tags: ["Tenants"], summary: "List tenants", security: [{ bearerAuth: [] }], responses: { 200: { description: "Paginated tenants" }, ...commonResponses } },
        post: { tags: ["Tenants"], summary: "Create tenant", security: [{ bearerAuth: [] }], responses: { 201: { description: "Tenant created" }, ...commonResponses } },
      },
      "/api/v1/tenants/{id}": {
        parameters: idParam(),
        get: { tags: ["Tenants"], summary: "Get tenant", security: [{ bearerAuth: [] }], responses: { 200: { description: "Tenant found" }, ...commonResponses } },
        patch: { tags: ["Tenants"], summary: "Update tenant", security: [{ bearerAuth: [] }], responses: { 200: { description: "Tenant updated" }, ...commonResponses } },
        delete: { tags: ["Tenants"], summary: "Delete tenant", security: [{ bearerAuth: [] }], responses: { 204: { description: "Tenant deleted" }, ...commonResponses } },
      },
      "/api/v1/users": {
        get: { tags: ["Users"], summary: "List users", security: [{ bearerAuth: [] }], responses: { 200: { description: "Paginated users" }, ...commonResponses } },
        post: { tags: ["Users"], summary: "Create user", security: [{ bearerAuth: [] }], responses: { 201: { description: "User created" }, ...commonResponses } },
      },
      "/api/v1/users/{id}": {
        parameters: idParam(),
        get: { tags: ["Users"], summary: "Get user", security: [{ bearerAuth: [] }], responses: { 200: { description: "User found" }, ...commonResponses } },
        patch: { tags: ["Users"], summary: "Update user", security: [{ bearerAuth: [] }], responses: { 200: { description: "User updated" }, ...commonResponses } },
      },
      "/api/v1/plans": {
        get: { tags: ["Plans"], summary: "List plans", security: [{ bearerAuth: [] }], responses: { 200: { description: "Paginated plans" }, ...commonResponses } },
        post: { tags: ["Plans"], summary: "Create plan", security: [{ bearerAuth: [] }], responses: { 201: { description: "Plan created" }, ...commonResponses } },
      },
      "/api/v1/agents": {
        get: { tags: ["Agents"], summary: "List agents", security: [{ bearerAuth: [] }], responses: { 200: { description: "Paginated agents" }, ...commonResponses } },
        post: { tags: ["Agents"], summary: "Register agent", security: [{ bearerAuth: [] }], responses: { 201: { description: "Agent registered" }, ...commonResponses } },
      },
      "/api/v1/audit-logs": {
        get: { tags: ["Audit Logs"], summary: "List audit logs", security: [{ bearerAuth: [] }], responses: { 200: { description: "Paginated audit logs" }, ...commonResponses } },
      },
    },
  };
}
