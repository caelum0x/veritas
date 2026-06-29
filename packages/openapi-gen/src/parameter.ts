// Builder functions for OpenAPI parameter objects (path, query, header, cookie).
import type { ParameterObject, SchemaObject } from "./types.js";

export type ParameterLocation = "query" | "header" | "path" | "cookie";

export interface ParameterOptions {
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly example?: unknown;
}

export function buildParameter(
  name: string,
  location: ParameterLocation,
  schema: SchemaObject,
  options: ParameterOptions = {},
): ParameterObject {
  const base: ParameterObject = {
    name,
    in: location,
    schema,
    ...(options.description !== undefined && { description: options.description }),
    ...(options.deprecated === true && { deprecated: true }),
    ...(options.example !== undefined && { example: options.example }),
  };

  // Path parameters are always required per OpenAPI spec
  const required = location === "path" ? true : (options.required ?? false);
  return { ...base, required };
}

export function pathParam(
  name: string,
  schema: SchemaObject,
  options: Omit<ParameterOptions, "required"> = {},
): ParameterObject {
  return buildParameter(name, "path", schema, { ...options, required: true });
}

export function queryParam(
  name: string,
  schema: SchemaObject,
  options: ParameterOptions = {},
): ParameterObject {
  return buildParameter(name, "query", schema, options);
}

export function headerParam(
  name: string,
  schema: SchemaObject,
  options: ParameterOptions = {},
): ParameterObject {
  return buildParameter(name, "header", schema, options);
}

export function cookieParam(
  name: string,
  schema: SchemaObject,
  options: ParameterOptions = {},
): ParameterObject {
  return buildParameter(name, "cookie", schema, options);
}

// Common reusable parameters used across Veritas API routes
export const commonParameters = {
  pageParam: queryParam(
    "page",
    { type: "integer", minimum: 1, default: 1 },
    { description: "Page number (1-indexed)" },
  ),

  limitParam: queryParam(
    "limit",
    { type: "integer", minimum: 1, maximum: 100, default: 20 },
    { description: "Number of items per page" },
  ),

  cursorParam: queryParam(
    "cursor",
    { type: "string" },
    { description: "Opaque pagination cursor" },
  ),

  idParam: (resourceName: string): ParameterObject =>
    pathParam(
      "id",
      { type: "string" },
      { description: `The ${resourceName} ID` },
    ),

  orgIdParam: queryParam(
    "orgId",
    { type: "string" },
    { description: "Filter by organization ID", required: false },
  ),

  xRequestId: headerParam(
    "X-Request-ID",
    { type: "string" },
    { description: "Idempotency / tracing request identifier" },
  ),

  authorizationHeader: headerParam(
    "Authorization",
    { type: "string", pattern: "^Bearer .+" },
    { description: "Bearer token for authentication", required: true },
  ),
} as const;

export function mergeParameters(
  base: readonly ParameterObject[],
  overrides: readonly ParameterObject[],
): readonly ParameterObject[] {
  const overrideMap = new Map(overrides.map((p) => [`${p.in}:${p.name}`, p]));
  const merged = base.map((p) => overrideMap.get(`${p.in}:${p.name}`) ?? p);
  const existing = new Set(base.map((p) => `${p.in}:${p.name}`));
  const additions = overrides.filter((p) => !existing.has(`${p.in}:${p.name}`));
  return [...merged, ...additions];
}
