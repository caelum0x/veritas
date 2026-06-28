// Request builder: composes RequestOptions with auth, idempotency, and path helpers.
import { newId } from "@veritas/core";
import type { RequestOptions } from "./transport.js";
import type { SdkConfig } from "../config.js";

type HttpMethod = RequestOptions["method"];

export interface BuildRequestInput {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Override default idempotency key generation */
  idempotencyKey?: string;
  /** Additional headers to merge */
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Build a fully-resolved RequestOptions from a BuildRequestInput and the resolved SdkConfig.
 * Mutating requests (POST/PUT/PATCH/DELETE) automatically get an idempotency key unless one is provided.
 */
export function buildRequest(input: BuildRequestInput, config: SdkConfig): RequestOptions {
  const {
    method,
    path,
    query,
    body,
    extraHeaders,
    timeoutMs,
  } = input;

  const isMutating = method !== "GET" && method !== "DELETE";
  let idempotencyKey = input.idempotencyKey;

  if (isMutating && !idempotencyKey) {
    const prefix = config.idempotencyKeyPrefix ?? "sdk";
    idempotencyKey = `${prefix}-${newId("req")}`;
  }

  return {
    method,
    path,
    query,
    body,
    headers: extraHeaders,
    timeoutMs,
    idempotencyKey,
  };
}

/**
 * Interpolate path parameters into a URL template.
 * Example: interpolatePath("/claims/:id", { id: "abc" }) => "/claims/abc"
 */
export function interpolatePath(template: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, encodeURIComponent(value)),
    template
  );
}

/**
 * Convert a plain object to a query parameter map, filtering out undefined values
 * and converting booleans and numbers to strings for transport.
 */
export function toQueryParams(
  input: Record<string, string | number | boolean | undefined | null>
): Record<string, string | number | boolean | undefined> {
  const result: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
