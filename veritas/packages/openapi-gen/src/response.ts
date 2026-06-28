// Builder functions for OpenAPI response objects with standard Veritas envelope shapes.
import type { ResponseObject, SchemaObject, MediaTypeObject } from "./types.js";

export type StatusCode = number;
export type ContentType = string;

export interface ResponseOptions {
  readonly headers?: Record<string, { schema: SchemaObject; description?: string }>;
  readonly examples?: Record<string, { value?: unknown; summary?: string }>;
}

export function buildResponse(
  description: string,
  schema?: SchemaObject,
  contentType: ContentType = "application/json",
  options: ResponseOptions = {},
): ResponseObject {
  if (schema === undefined) {
    return {
      description,
      ...(options.headers && { headers: options.headers }),
    };
  }

  const mediaType: MediaTypeObject = {
    schema,
    ...(options.examples && { examples: options.examples }),
  };

  return {
    description,
    content: { [contentType]: mediaType },
    ...(options.headers && { headers: options.headers }),
  };
}

// Standard Veritas API success envelope schema reference
export function successResponse(
  description: string,
  dataSchema: SchemaObject,
  options: ResponseOptions = {},
): ResponseObject {
  const envelopeSchema: SchemaObject = {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", const: true },
      data: dataSchema,
    },
  };
  return buildResponse(description, envelopeSchema, "application/json", options);
}

// Standard Veritas API paginated response envelope
export function pageResponse(
  description: string,
  itemSchema: SchemaObject,
  options: ResponseOptions = {},
): ResponseObject {
  const pageSchema: SchemaObject = {
    type: "object",
    required: ["success", "data", "meta"],
    properties: {
      success: { type: "boolean", const: true },
      data: { type: "array", items: itemSchema },
      meta: {
        type: "object",
        required: ["total", "page", "limit", "hasNext"],
        properties: {
          total: { type: "integer", description: "Total number of items" },
          page: { type: "integer", description: "Current page number" },
          limit: { type: "integer", description: "Items per page" },
          hasNext: { type: "boolean", description: "Whether more pages exist" },
          cursor: { type: "string", description: "Opaque cursor for next page" },
        },
      },
    },
  };
  return buildResponse(description, pageSchema, "application/json", options);
}

// Standard Veritas API error envelope schema
export function errorResponse(description: string, options: ResponseOptions = {}): ResponseObject {
  const errorSchema: SchemaObject = {
    type: "object",
    required: ["success", "error"],
    properties: {
      success: { type: "boolean", const: false },
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string", description: "Machine-readable error code" },
          message: { type: "string", description: "Human-readable error message" },
          details: {
            type: "object",
            additionalProperties: true,
            description: "Additional error context",
          },
          fields: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "message"],
              properties: {
                field: { type: "string" },
                message: { type: "string" },
                code: { type: "string" },
              },
            },
            description: "Field-level validation errors",
          },
        },
      },
    },
  };
  return buildResponse(description, errorSchema, "application/json", options);
}

// Common HTTP response definitions reused across routes
export const commonResponses: Record<StatusCode, ResponseObject> = {
  400: errorResponse("Bad Request — validation failed"),
  401: errorResponse("Unauthorized — missing or invalid credentials"),
  403: errorResponse("Forbidden — insufficient permissions"),
  404: errorResponse("Not Found — resource does not exist"),
  409: errorResponse("Conflict — resource already exists or state conflict"),
  422: errorResponse("Unprocessable Entity — semantic validation failed"),
  429: errorResponse("Too Many Requests — rate limit exceeded"),
  500: errorResponse("Internal Server Error"),
} as const;

export function noContentResponse(description = "No Content"): ResponseObject {
  return { description };
}

export function refResponse(refName: string, description?: string): ResponseObject {
  // Returns a $ref to a component response; description is informational only
  return {
    description: description ?? refName,
    content: {
      "application/json": {
        schema: { $ref: `#/components/responses/${refName}` },
      },
    },
  };
}
