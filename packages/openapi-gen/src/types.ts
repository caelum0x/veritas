// Core OpenAPI 3.1 TypeScript type definitions used across the openapi-gen module.

export type SchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface SchemaObject {
  readonly type?: SchemaType | readonly SchemaType[];
  readonly format?: string;
  readonly title?: string;
  readonly description?: string;
  readonly default?: unknown;
  readonly examples?: readonly unknown[];
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly properties?: Record<string, SchemaObject>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | SchemaObject;
  readonly items?: SchemaObject;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly nullable?: boolean;
  readonly readOnly?: boolean;
  readonly writeOnly?: boolean;
  readonly deprecated?: boolean;
  readonly allOf?: readonly SchemaObject[];
  readonly anyOf?: readonly SchemaObject[];
  readonly oneOf?: readonly SchemaObject[];
  readonly not?: SchemaObject;
  readonly $ref?: string;
  readonly [key: string]: unknown;
}

export interface MediaTypeObject {
  readonly schema?: SchemaObject;
  readonly example?: unknown;
  readonly examples?: Record<string, { value?: unknown; summary?: string }>;
}

export interface ResponseObject {
  readonly description: string;
  readonly content?: Record<string, MediaTypeObject>;
  readonly headers?: Record<string, { schema: SchemaObject; description?: string }>;
}

export interface ParameterObject {
  readonly name: string;
  readonly in: "query" | "header" | "path" | "cookie";
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly schema: SchemaObject;
  readonly example?: unknown;
}

export interface RequestBodyObject {
  readonly description?: string;
  readonly required?: boolean;
  readonly content: Record<string, MediaTypeObject>;
}

export interface OperationObject {
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly parameters?: readonly ParameterObject[];
  readonly requestBody?: RequestBodyObject;
  readonly responses: Record<string, ResponseObject>;
  readonly security?: readonly Record<string, readonly string[]>[];
  readonly deprecated?: boolean;
}

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "trace";

export type PathItemObject = {
  readonly [M in HttpMethod]?: OperationObject;
} & {
  readonly summary?: string;
  readonly description?: string;
  readonly parameters?: readonly ParameterObject[];
};

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject>;
  responses?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  securitySchemes?: Record<string, unknown>;
}

export interface InfoObject {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  readonly termsOfService?: string;
  readonly contact?: { name?: string; url?: string; email?: string };
  readonly license?: { name: string; url?: string };
}

export interface ServerObject {
  readonly url: string;
  readonly description?: string;
  readonly variables?: Record<string, { default: string; description?: string; enum?: readonly string[] }>;
}

export interface TagObject {
  readonly name: string;
  readonly description?: string;
  readonly externalDocs?: ExternalDocsObject;
}

export interface ExternalDocsObject {
  readonly url: string;
  readonly description?: string;
}

export interface OpenApiDocument {
  readonly openapi: string;
  readonly info: InfoObject;
  readonly paths: Record<string, PathItemObject>;
  readonly components?: ComponentsObject;
  readonly tags?: readonly TagObject[];
  readonly servers?: readonly ServerObject[];
  readonly security?: readonly Record<string, readonly string[]>[];
  readonly externalDocs?: ExternalDocsObject;
}

/** Descriptor for a single route registered into the spec registry. */
export interface RouteDescriptor {
  readonly method: HttpMethod;
  readonly path: string;
  readonly operationId: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly deprecated?: boolean;
  readonly parameters?: readonly ParameterObject[];
  readonly requestBody?: RequestBodyObject;
  readonly responses: Record<string, ResponseObject>;
  readonly security?: readonly Record<string, readonly string[]>[];
}

/** Options passed when constructing a SpecRegistry. */
export interface RegistryOptions {
  readonly info: InfoObject;
  readonly servers?: readonly ServerObject[];
  readonly tags?: readonly TagObject[];
  readonly security?: readonly Record<string, readonly string[]>[];
  readonly components?: ComponentsObject;
}
