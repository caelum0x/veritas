// Generate example request/response bodies from OpenAPI schema objects.

import type { SchemaObject } from "@veritas/openapi-gen";
import { ExampleGenerationError } from "./errors.js";
import type { PostmanResponse, PostmanRequest } from "./types.js";

const MAX_DEPTH = 5;

function exampleForPrimitive(schema: SchemaObject): unknown {
  if (schema.example !== undefined) return schema.example;
  if (schema.examples && schema.examples.length > 0) return schema.examples[0];
  if (schema.const !== undefined) return schema.const;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  const fmt = schema.format ?? "";
  switch (schema.type) {
    case "string":
      if (fmt === "date-time") return "2024-01-01T00:00:00.000Z";
      if (fmt === "date") return "2024-01-01";
      if (fmt === "email") return "user@example.com";
      if (fmt === "uri" || fmt === "url") return "https://example.com";
      if (fmt === "uuid") return "00000000-0000-0000-0000-000000000000";
      if (fmt === "password") return "••••••••";
      return "string";
    case "number":
    case "integer":
      if (schema.minimum !== undefined) return schema.minimum;
      return fmt === "float" || fmt === "double" ? 0.0 : 0;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return null;
  }
}

function exampleForSchema(schema: SchemaObject, depth = 0): unknown {
  if (depth > MAX_DEPTH) return null;

  if (schema.$ref) {
    return `<ref: ${schema.$ref}>`;
  }

  if (schema.allOf && schema.allOf.length > 0) {
    return schema.allOf.reduce<Record<string, unknown>>((acc, sub) => {
      const val = exampleForSchema(sub, depth + 1);
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return { ...acc, ...(val as Record<string, unknown>) };
      }
      return acc;
    }, {});
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    return exampleForSchema(schema.anyOf[0] as SchemaObject, depth + 1);
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    return exampleForSchema(schema.oneOf[0] as SchemaObject, depth + 1);
  }

  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
    ? [schema.type]
    : ["object"];

  const effectiveType = types[0];

  if (effectiveType === "object" || (!effectiveType && schema.properties)) {
    const obj: Record<string, unknown> = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = exampleForSchema(prop as SchemaObject, depth + 1);
      }
    }
    return obj;
  }

  if (effectiveType === "array") {
    if (schema.items) {
      return [exampleForSchema(schema.items as SchemaObject, depth + 1)];
    }
    return [];
  }

  return exampleForPrimitive({ ...schema, type: effectiveType as SchemaObject["type"] });
}

/** Generate an example JSON value from a schema object. */
export function makeExample(schema: SchemaObject): unknown {
  return exampleForSchema(schema);
}

export function generateBodyExample(schema: SchemaObject): string {
  try {
    const example = exampleForSchema(schema);
    return JSON.stringify(example, null, 2);
  } catch (err) {
    throw new ExampleGenerationError(
      `Failed to generate body example: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function generateResponseExample(
  schema: SchemaObject,
  statusCode: number,
  statusText: string,
  originalRequest: PostmanRequest,
): PostmanResponse {
  const body = generateBodyExample(schema);
  return {
    name: `${statusCode} ${statusText}`,
    status: statusText,
    code: statusCode,
    header: [{ key: "Content-Type", value: "application/json" }],
    body,
    originalRequest,
  };
}

export function schemaToExampleJson(schema: SchemaObject): unknown {
  return exampleForSchema(schema);
}

export function makeSuccessResponse(
  operationName: string,
  statusCode: number,
  body: unknown,
  originalRequest: PostmanRequest,
): PostmanResponse {
  const statusText = HTTP_STATUS_TEXTS[statusCode] ?? "OK";
  return {
    name: `${operationName} - ${statusCode}`,
    status: statusText,
    code: statusCode,
    header: [{ key: "Content-Type", value: "application/json" }],
    body: typeof body === "string" ? body : JSON.stringify(body, null, 2),
    originalRequest,
  };
}

export function makeErrorResponse(
  operationName: string,
  statusCode: number,
  errorMessage: string,
  originalRequest: PostmanRequest,
): PostmanResponse {
  const statusText = HTTP_STATUS_TEXTS[statusCode] ?? "Error";
  return {
    name: `${operationName} - ${statusCode}`,
    status: statusText,
    code: statusCode,
    header: [{ key: "Content-Type", value: "application/json" }],
    body: JSON.stringify({ success: false, error: { message: errorMessage, code: statusCode } }, null, 2),
    originalRequest,
  };
}

/** Alias for makeSuccessResponse — create a 200 OK example response. */
export function makeSuccessExample(
  operationName: string,
  body: unknown,
  originalRequest: PostmanRequest,
): PostmanResponse {
  return makeSuccessResponse(operationName, 200, body, originalRequest);
}

/** Alias for makeErrorResponse — create an error example response. */
export function makeErrorExample(
  operationName: string,
  statusCode: number,
  errorMessage: string,
  originalRequest: PostmanRequest,
): PostmanResponse {
  return makeErrorResponse(operationName, statusCode, errorMessage, originalRequest);
}

const HTTP_STATUS_TEXTS: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};
