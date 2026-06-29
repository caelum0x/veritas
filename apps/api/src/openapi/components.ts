// Shared OpenAPI component definitions (schemas, responses, parameters, securitySchemes)

// Inline type for OpenAPI 3.0 components object to avoid openapi-types dependency
type ComponentsObject = Record<string, unknown>;

export function buildComponents(): ComponentsObject {
  return {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description: "API key issued by Veritas for authenticated access",
      },
    },
    parameters: {
      IdParam: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", minLength: 1 },
        description: "Opaque resource identifier",
      },
      PageParam: {
        name: "page",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, default: 1 },
        description: "Page number (1-indexed)",
      },
      LimitParam: {
        name: "limit",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        description: "Items per page",
      },
      CursorParam: {
        name: "cursor",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "Opaque pagination cursor",
      },
      IdempotencyKeyHeader: {
        name: "Idempotency-Key",
        in: "header",
        required: false,
        schema: { type: "string", minLength: 1, maxLength: 255 },
        description: "Client-supplied idempotency key to prevent duplicate mutations",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string", description: "Machine-readable error code" },
          message: { type: "string", description: "Human-readable error message" },
          fields: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "message"],
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
            description: "Field-level validation errors",
          },
        },
      },
      ApiFailure: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
          error: { $ref: "#/components/schemas/ApiError" },
        },
      },
      PageMeta: {
        type: "object",
        required: ["total", "page", "limit", "hasNext"],
        properties: {
          total: { type: "integer", description: "Total number of items" },
          page: { type: "integer", description: "Current page number" },
          limit: { type: "integer", description: "Items per page" },
          hasNext: { type: "boolean", description: "Whether more pages exist" },
          cursor: { type: "string", description: "Cursor for next page" },
        },
      },
      Timestamp: {
        type: "string",
        format: "date-time",
        description: "ISO 8601 UTC timestamp",
      },
      Id: {
        type: "string",
        minLength: 1,
        description: "Opaque resource identifier",
      },
    },
    responses: {
      BadRequest: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiFailure" },
          },
        },
      },
      Unauthorized: {
        description: "Missing or invalid API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiFailure" },
          },
        },
      },
      Forbidden: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiFailure" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiFailure" },
          },
        },
      },
      Conflict: {
        description: "Resource already exists or state conflict",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiFailure" },
          },
        },
      },
      TooManyRequests: {
        description: "Rate limit exceeded",
        headers: {
          "Retry-After": {
            schema: { type: "integer" },
            description: "Seconds until the rate limit resets",
          },
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiFailure" },
          },
        },
      },
      InternalServerError: {
        description: "Unexpected server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiFailure" },
          },
        },
      },
    },
  };
}
