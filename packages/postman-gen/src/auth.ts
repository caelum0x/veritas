// Build Postman auth objects from OpenAPI security scheme definitions.

import { AuthConfigError } from "./errors.js";
import type {
  PostmanAuth,
  PostmanAuthAttribute,
  PostmanAuthType,
} from "./types.js";

export interface ApiKeyAuthOptions {
  readonly key: string;
  readonly value: string;
  readonly in: "header" | "query";
}

export interface BearerAuthOptions {
  readonly token: string;
}

export interface BasicAuthOptions {
  readonly username: string;
  readonly password: string;
}

export interface OAuth2AuthOptions {
  readonly accessToken: string;
  readonly tokenType?: string;
  readonly addTokenTo?: "header" | "queryParams";
  readonly tokenUrl?: string;
  readonly authUrl?: string;
  readonly clientId?: string;
  readonly scope?: string;
}

function attrs(pairs: ReadonlyArray<readonly [string, string]>): readonly PostmanAuthAttribute[] {
  return pairs.map(([key, value]) => ({ key, value, type: "string" }));
}

export function noAuth(): PostmanAuth {
  return { type: "noauth" };
}

export function inheritAuth(): PostmanAuth {
  return { type: "inherit" };
}

export function apiKeyAuth(options: ApiKeyAuthOptions): PostmanAuth {
  if (!options.key) {
    throw new AuthConfigError("API key name (key) is required");
  }
  return {
    type: "apikey",
    apikey: attrs([
      ["key", options.key],
      ["value", options.value],
      ["in", options.in],
    ]),
  };
}

export function bearerAuth(options: BearerAuthOptions): PostmanAuth {
  return {
    type: "bearer",
    bearer: attrs([["token", options.token]]),
  };
}

export function basicAuth(options: BasicAuthOptions): PostmanAuth {
  return {
    type: "basic",
    basic: attrs([
      ["username", options.username],
      ["password", options.password],
    ]),
  };
}

export function oauth2Auth(options: OAuth2AuthOptions): PostmanAuth {
  const pairs: Array<readonly [string, string]> = [
    ["accessToken", options.accessToken],
    ["addTokenTo", options.addTokenTo ?? "header"],
    ["tokenType", options.tokenType ?? "Bearer"],
  ];
  if (options.tokenUrl) pairs.push(["accessTokenUrl", options.tokenUrl]);
  if (options.authUrl) pairs.push(["authUrl", options.authUrl]);
  if (options.clientId) pairs.push(["clientId", options.clientId]);
  if (options.scope) pairs.push(["scope", options.scope]);
  return { type: "oauth2", oauth2: attrs(pairs) };
}

export function authFromSecurityScheme(
  schemeType: string,
  options: Record<string, string> = {},
): PostmanAuth {
  switch (schemeType) {
    case "apiKey":
      return apiKeyAuth({
        key: options["name"] ?? "X-API-Key",
        value: options["value"] ?? `{{apiKey}}`,
        in: (options["in"] as "header" | "query") ?? "header",
      });
    case "http": {
      const scheme = options["scheme"] ?? "bearer";
      if (scheme === "bearer") {
        return bearerAuth({ token: options["token"] ?? "{{bearerToken}}" });
      }
      if (scheme === "basic") {
        return basicAuth({
          username: options["username"] ?? "{{username}}",
          password: options["password"] ?? "{{password}}",
        });
      }
      return bearerAuth({ token: `{{token}}` });
    }
    case "oauth2":
      return oauth2Auth({
        accessToken: options["accessToken"] ?? "{{accessToken}}",
        tokenUrl: options["tokenUrl"],
        authUrl: options["authUrl"],
        clientId: options["clientId"],
        scope: options["scope"],
      });
    case "openIdConnect":
      return bearerAuth({ token: options["token"] ?? "{{oidcToken}}" });
    default:
      return noAuth();
  }
}

export function veritasDefaultAuth(): PostmanAuth {
  return apiKeyAuth({
    key: "X-API-Key",
    value: "{{apiKey}}",
    in: "header",
  });
}

export const AUTH_TYPES: readonly PostmanAuthType[] = [
  "apikey",
  "bearer",
  "basic",
  "oauth2",
  "noauth",
  "inherit",
];

/**
 * Build the root-level collection auth based on a string auth type.
 * Delegates to the appropriate factory with sensible defaults.
 */
export function buildCollectionAuth(authType: string): PostmanAuth {
  switch (authType) {
    case "bearer":
      return bearerAuth({ token: "{{bearerToken}}" });
    case "apikey":
    case "apiKey":
      return apiKeyAuth({ key: "X-API-Key", value: "{{apiKey}}", in: "header" });
    case "basic":
      return basicAuth({ username: "{{username}}", password: "{{password}}" });
    case "none":
    case "noauth":
      return noAuth();
    default:
      return bearerAuth({ token: "{{bearerToken}}" });
  }
}

/** Alias for buildCollectionAuth used in the public API. */
export function makeAuth(authType: string): PostmanAuth {
  return buildCollectionAuth(authType);
}
