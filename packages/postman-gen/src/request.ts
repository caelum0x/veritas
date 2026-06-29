// Builds PostmanRequest objects from OpenAPI operation descriptors.

import type { OperationObject, ParameterObject, RequestBodyObject, HttpMethod } from "@veritas/openapi-gen";
import type {
  PostmanRequest,
  PostmanUrl,
  PostmanHeader,
  PostmanBody,
  PostmanKeyValue,
  PostmanResponse,
  PostmanItem,
} from "./types.js";
import { buildUrl } from "./variable.js";

/** Derive Content-Type header from the request body. */
function contentTypeHeader(body: RequestBodyObject): PostmanHeader | undefined {
  const contentTypes = Object.keys(body.content);
  if (contentTypes.length === 0) return undefined;
  const ct = contentTypes[0] ?? "application/json";
  return { key: "Content-Type", value: ct };
}

/** Convert a RequestBodyObject to a PostmanBody. */
function buildBody(body: RequestBodyObject): PostmanBody {
  const hasJson = "application/json" in body.content;
  if (hasJson) {
    const schema = body.content["application/json"]?.schema;
    const example = body.content["application/json"]?.example;
    const raw = example !== undefined
      ? JSON.stringify(example, null, 2)
      : schema
        ? JSON.stringify(schemaToExample(schema), null, 2)
        : "{}";
    return {
      mode: "raw",
      raw,
      options: { raw: { language: "json" } },
    };
  }
  return { mode: "raw", raw: "{}", options: { raw: { language: "json" } } };
}

/** Produce a minimal example value from a JSON schema object. */
export function schemaToExample(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return null;
  const s = schema as Record<string, unknown>;
  if (s["example"] !== undefined) return s["example"];
  const type = s["type"];
  if (type === "string") return s["format"] === "date-time" ? "2024-01-01T00:00:00Z" : "string";
  if (type === "number" || type === "integer") return 0;
  if (type === "boolean") return true;
  if (type === "array") return [schemaToExample(s["items"])];
  if (type === "object") {
    const props = s["properties"] as Record<string, unknown> | undefined;
    if (!props) return {};
    return Object.fromEntries(
      Object.entries(props).map(([k, v]) => [k, schemaToExample(v)]),
    );
  }
  return null;
}

/** Convert query parameters to PostmanKeyValue list. */
function buildQueryParams(params: readonly ParameterObject[]): readonly PostmanKeyValue[] {
  return params
    .filter((p) => p.in === "query")
    .map((p) => ({
      key: p.name,
      value: p.example !== undefined ? String(p.example) : `{{${p.name}}}`,
      description: p.description,
      disabled: !p.required,
    }));
}

/** Convert header parameters to PostmanHeader list. */
function buildHeaderParams(params: readonly ParameterObject[]): readonly PostmanHeader[] {
  return params
    .filter((p) => p.in === "header")
    .map((p) => ({
      key: p.name,
      value: p.example !== undefined ? String(p.example) : `{{${p.name}}}`,
      description: p.description,
    }));
}

/** Create a PostmanHeader key-value pair. */
export function makeHeader(key: string, value: string, description?: string): PostmanHeader {
  return { key, value, description };
}

/** Create a PostmanUrl object. */
export function makeUrl(
  raw: string,
  options?: {
    protocol?: string;
    host?: readonly string[];
    path?: readonly string[];
    query?: readonly PostmanKeyValue[];
    variable?: readonly PostmanKeyValue[];
  },
): PostmanUrl {
  return { raw, ...options };
}

/** Create a raw JSON PostmanBody. */
export function makeBody(raw: string): PostmanBody {
  return { mode: "raw", raw, options: { raw: { language: "json" } } };
}

/** Construct a PostmanRequest object from its parts. */
export function makeRequest(opts: {
  readonly name: string;
  readonly description?: string;
  readonly method: string;
  readonly url: PostmanUrl;
  readonly header?: readonly PostmanHeader[];
  readonly body?: PostmanBody;
}): PostmanRequest {
  return {
    name: opts.name,
    description: opts.description,
    method: opts.method,
    url: opts.url,
    header: opts.header,
    body: opts.body,
  };
}

/** Construct a PostmanItem (named request with optional responses). */
export function makeRequestItem(
  request: PostmanRequest,
  responses?: readonly PostmanResponse[],
): PostmanItem {
  return { name: request.name, description: request.description, request, response: responses };
}

/** Build a PostmanRequest from an OpenAPI path + method + operation. */
export function buildRequest(
  method: HttpMethod,
  path: string,
  operation: OperationObject,
  baseUrl: string,
): PostmanRequest {
  const params = operation.parameters ?? [];
  const queryParams = buildQueryParams(params);
  const headerParams = buildHeaderParams(params);
  const url: PostmanUrl = buildUrl(baseUrl, path, params, queryParams);
  const headers: PostmanHeader[] = [...headerParams];

  let body: PostmanBody | undefined;
  if (operation.requestBody) {
    const ctHeader = contentTypeHeader(operation.requestBody);
    if (ctHeader) headers.push(ctHeader);
    body = buildBody(operation.requestBody);
  }

  return {
    name: operation.summary ?? `${method.toUpperCase()} ${path}`,
    description: operation.description,
    method: method.toUpperCase(),
    url,
    header: headers.length > 0 ? headers : undefined,
    body,
  };
}
