// Postman collection variable builders and URL construction helpers.

import type { ParameterObject } from "@veritas/openapi-gen";
import type { PostmanVariable, PostmanUrl, PostmanKeyValue } from "./types.js";

/** Create a simple string collection variable. */
export function makeVariable(
  key: string,
  value: string,
  description?: string,
): PostmanVariable {
  return { key, value, description, type: "string" };
}

/** Alias for makeVariable — create a string-typed collection variable. */
export function makeStringVariable(
  key: string,
  value: string,
  description?: string,
): PostmanVariable {
  return makeVariable(key, value, description);
}

/** Create a secret collection variable (masked in UI). */
export function makeSecretVariable(
  key: string,
  value: string,
  description?: string,
): PostmanVariable {
  return { key, value, description, type: "secret" };
}

/** Standard base-URL variable for Veritas collections. */
export function baseUrlVariable(url: string): PostmanVariable {
  return makeVariable("baseUrl", url, "API base URL");
}

/** Alias for baseUrlVariable — create the baseUrl collection variable. */
export function makeBaseUrlVariable(url: string): PostmanVariable {
  return baseUrlVariable(url);
}

/** Standard API-key variable for Veritas collections. */
export function apiKeyVariable(value = ""): PostmanVariable {
  return makeSecretVariable("apiKey", value, "Veritas API key");
}

/** Standard bearer-token variable for Veritas collections. */
export function bearerTokenVariable(value = ""): PostmanVariable {
  return makeSecretVariable("bearerToken", value, "Bearer token");
}

/** Default set of variables every generated collection should include. */
export function defaultVariables(baseUrl: string): readonly PostmanVariable[] {
  return [baseUrlVariable(baseUrl), apiKeyVariable(), bearerTokenVariable()];
}

/** Alias for defaultVariables — the standard collection variables. */
export function defaultCollectionVariables(baseUrl: string): readonly PostmanVariable[] {
  return defaultVariables(baseUrl);
}

/** Parse an OpenAPI server URL into protocol + host segments. */
function parseBaseUrl(raw: string): { protocol: string; host: readonly string[] } {
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return {
      protocol: u.protocol.replace(":", ""),
      host: u.hostname.split("."),
    };
  } catch {
    return { protocol: "https", host: [raw] };
  }
}

/** Convert an OpenAPI path template ({param}) to Postman format (:param). */
export function openApiPathToPostman(path: string): readonly string[] {
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => (seg.startsWith("{") && seg.endsWith("}") ? `:${seg.slice(1, -1)}` : seg));
}

/** Extract path parameter variables from OpenAPI parameters. */
function pathVariables(
  path: string,
  params: readonly ParameterObject[],
): readonly PostmanKeyValue[] {
  const pathParams = params.filter((p) => p.in === "path");
  const matches = path.match(/\{([^}]+)\}/g) ?? [];
  return matches.map((match) => {
    const name = match.slice(1, -1);
    const param = pathParams.find((p) => p.name === name);
    return {
      key: name,
      value: param?.example !== undefined ? String(param.example) : `{{${name}}}`,
      description: param?.description,
    };
  });
}

/** Build a PostmanUrl from an OpenAPI base URL, path, and parameters. */
export function buildUrl(
  baseUrl: string,
  path: string,
  params: readonly ParameterObject[],
  queryParams: readonly PostmanKeyValue[],
): PostmanUrl {
  const templateUrl = baseUrl.replace(/\/$/, "") + path;
  const { protocol, host } = parseBaseUrl(baseUrl);
  const pathSegments = openApiPathToPostman(path);
  const variable = pathVariables(path, params);

  return {
    raw: templateUrl,
    protocol,
    host,
    path: pathSegments,
    variable: variable.length > 0 ? variable : undefined,
    query: queryParams.length > 0 ? queryParams : undefined,
  };
}
