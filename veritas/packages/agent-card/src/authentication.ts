// Authentication scheme descriptors for agent card — defines how callers authenticate.

import { z } from "zod";

export const AuthSchemeTypeSchema = z.enum([
  "apiKey",
  "bearer",
  "oauth2",
  "mtls",
  "none",
]);
export type AuthSchemeType = z.infer<typeof AuthSchemeTypeSchema>;

export const ApiKeyAuthSchema = z.object({
  type: z.literal("apiKey"),
  in: z.enum(["header", "query"]),
  name: z.string().min(1),
  description: z.string().optional(),
});
export type ApiKeyAuth = z.infer<typeof ApiKeyAuthSchema>;

export const BearerAuthSchema = z.object({
  type: z.literal("bearer"),
  format: z.string().optional(),
  description: z.string().optional(),
});
export type BearerAuth = z.infer<typeof BearerAuthSchema>;

export const OAuth2ScopeSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});
export type OAuth2Scope = z.infer<typeof OAuth2ScopeSchema>;

export const OAuth2AuthSchema = z.object({
  type: z.literal("oauth2"),
  authorizationUrl: z.string().url(),
  tokenUrl: z.string().url(),
  scopes: z.array(OAuth2ScopeSchema),
  description: z.string().optional(),
});
export type OAuth2Auth = z.infer<typeof OAuth2AuthSchema>;

export const MtlsAuthSchema = z.object({
  type: z.literal("mtls"),
  caBundle: z.string().optional(),
  description: z.string().optional(),
});
export type MtlsAuth = z.infer<typeof MtlsAuthSchema>;

export const NoAuthSchema = z.object({
  type: z.literal("none"),
  description: z.string().optional(),
});
export type NoAuth = z.infer<typeof NoAuthSchema>;

export const AuthSchemeSchema = z.discriminatedUnion("type", [
  ApiKeyAuthSchema,
  BearerAuthSchema,
  OAuth2AuthSchema,
  MtlsAuthSchema,
  NoAuthSchema,
]);
export type AuthScheme = z.infer<typeof AuthSchemeSchema>;

/** Construct an API-key auth scheme placed in a request header. */
export function headerApiKeyAuth(name: string, description?: string): ApiKeyAuth {
  return { type: "apiKey", in: "header", name, description };
}

/** Construct a Bearer token auth scheme. */
export function bearerAuth(format?: string, description?: string): BearerAuth {
  return { type: "bearer", format, description };
}

/** Construct an OAuth2 auth scheme. */
export function oauth2Auth(
  authorizationUrl: string,
  tokenUrl: string,
  scopes: OAuth2Scope[],
  description?: string,
): OAuth2Auth {
  return { type: "oauth2", authorizationUrl, tokenUrl, scopes, description };
}

/** Construct a no-auth scheme (public endpoint). */
export function noAuth(description?: string): NoAuth {
  return { type: "none", description };
}
