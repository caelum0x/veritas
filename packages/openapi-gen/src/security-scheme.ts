// OpenAPI security scheme definitions and security requirement builders.
import type { SecuritySchemeObject, OAuthFlowsObject } from "./components.js";

export type { SecuritySchemeObject, OAuthFlowsObject };

export interface SecurityRequirement {
  readonly [schemeName: string]: readonly string[];
}

export function apikeyScheme(
  headerName: string,
  description?: string,
): SecuritySchemeObject {
  return {
    type: "apiKey",
    in: "header",
    name: headerName,
    ...(description !== undefined && { description }),
  };
}

export function bearerScheme(
  bearerFormat?: string,
  description?: string,
): SecuritySchemeObject {
  return {
    type: "http",
    scheme: "bearer",
    ...(bearerFormat !== undefined && { bearerFormat }),
    ...(description !== undefined && { description }),
  };
}

export function basicScheme(description?: string): SecuritySchemeObject {
  return {
    type: "http",
    scheme: "basic",
    ...(description !== undefined && { description }),
  };
}

export function oauth2Scheme(
  flows: OAuthFlowsObject,
  description?: string,
): SecuritySchemeObject {
  return {
    type: "oauth2",
    flows,
    ...(description !== undefined && { description }),
  };
}

export function openIdConnectScheme(
  openIdConnectUrl: string,
  description?: string,
): SecuritySchemeObject {
  return {
    type: "openIdConnect",
    openIdConnectUrl,
    ...(description !== undefined && { description }),
  };
}

export function securityRequirement(
  schemeName: string,
  scopes: readonly string[] = [],
): SecurityRequirement {
  return { [schemeName]: scopes };
}

export function andSecurity(
  ...requirements: readonly SecurityRequirement[]
): readonly SecurityRequirement[] {
  // All items in the array must be satisfied (AND within one object, OR across array items)
  // A single requirement object means all named schemes must be present
  const merged: Record<string, readonly string[]> = {};
  for (const req of requirements) {
    for (const [k, v] of Object.entries(req)) {
      merged[k] = v;
    }
  }
  return [merged];
}

export function orSecurity(
  ...requirements: readonly SecurityRequirement[]
): readonly SecurityRequirement[] {
  // Multiple objects means OR — any one can be used
  return requirements;
}

// Predefined Veritas security schemes
export const veritasSecuritySchemes = {
  apiKeyAuth: apikeyScheme("X-API-Key", "Veritas API key authentication"),
  bearerAuth: bearerScheme("JWT", "JWT bearer token (short-lived session token)"),
  oauth2Auth: oauth2Scheme(
    {
      authorizationCode: {
        authorizationUrl: "https://auth.veritas.io/oauth/authorize",
        tokenUrl: "https://auth.veritas.io/oauth/token",
        refreshUrl: "https://auth.veritas.io/oauth/refresh",
        scopes: {
          "claims:read": "Read claims and verification results",
          "claims:write": "Create and update claims",
          "sources:read": "Read source metadata",
          "sources:write": "Register and update sources",
          "reports:read": "Download reports",
          "reports:write": "Generate and manage reports",
          "admin": "Full administrative access",
        },
      },
    },
    "OAuth 2.0 authorization code flow for web applications",
  ),
} as const;

export const veritasSecurityRequirements = {
  apiKey: securityRequirement("apiKeyAuth"),
  bearer: securityRequirement("bearerAuth"),
  oauth2Read: securityRequirement("oauth2Auth", ["claims:read", "sources:read"]),
  oauth2Write: securityRequirement("oauth2Auth", ["claims:write"]),
  admin: securityRequirement("oauth2Auth", ["admin"]),
} as const;
