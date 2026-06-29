// OIDC provider: IdpProvider implementation using Authorization Code flow + discovery

import { z } from "zod";
import { ok, err, type Result, newId } from "@veritas/core";
import { SsoError, TokenExchangeError } from "../errors.js";
import type { IdpProvider, LoginOptions, LoginRedirect, CallbackParams } from "../provider.js";
import type { BaseProviderConfig, SsoPrincipal, CallbackResult } from "../types.js";
import { mapAttributes, type AttributeMap, DEFAULT_ATTRIBUTE_MAP } from "../attribute-mapping.js";
import { fetchOidcDiscovery } from "./discovery.js";

/** OIDC-specific provider configuration. */
export interface OidcProviderConfig extends BaseProviderConfig {
  readonly protocol: "oidc";
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes?: readonly string[];
  readonly attributeMap?: Partial<AttributeMap>;
}

export const OidcProviderConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  protocol: z.literal("oidc"),
  orgId: z.string().min(1),
  enabled: z.boolean(),
  issuer: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  redirectUri: z.string().url(),
  scopes: z.array(z.string()).optional(),
  attributeMap: z
    .object({
      externalId: z.string().optional(),
      email: z.string().optional(),
      displayName: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      groups: z.string().optional(),
    })
    .optional(),
});

const DEFAULT_SCOPES = ["openid", "email", "profile"] as const;

/** Decode a JWT payload without signature verification (for claim extraction only). */
function decodeJwtPayload(token: string): Result<Record<string, unknown>, SsoError> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return err(new SsoError("Malformed JWT: expected 3 segments"));
  }
  try {
    const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8");
    const parsed = JSON.parse(payload) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return err(new SsoError("JWT payload is not an object"));
    }
    return ok(parsed as Record<string, unknown>);
  } catch (cause) {
    return err(new SsoError("Failed to decode JWT payload", cause));
  }
}

/** Flatten JWT claims to a string-keyed attribute bag for attribute mapping. */
function claimsToAttributes(claims: Record<string, unknown>): Record<string, string | string[]> {
  const attrs: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(claims)) {
    if (typeof v === "string") {
      attrs[k] = v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      attrs[k] = String(v);
    } else if (Array.isArray(v)) {
      const strs = v.filter((x): x is string => typeof x === "string");
      if (strs.length > 0) attrs[k] = strs;
    }
  }
  return attrs;
}

/** OIDC Authorization Code flow IdP provider. */
export class OidcProvider implements IdpProvider {
  readonly config: BaseProviderConfig;
  private readonly oidcConfig: OidcProviderConfig;
  private readonly effectiveMap: AttributeMap;

  constructor(oidcConfig: OidcProviderConfig) {
    this.oidcConfig = oidcConfig;
    this.config = {
      id: oidcConfig.id,
      displayName: oidcConfig.displayName,
      protocol: "oidc",
      orgId: oidcConfig.orgId,
      enabled: oidcConfig.enabled,
    };
    this.effectiveMap = oidcConfig.attributeMap
      ? { ...DEFAULT_ATTRIBUTE_MAP, ...oidcConfig.attributeMap }
      : DEFAULT_ATTRIBUTE_MAP;
  }

  async initiateLogin(
    options: LoginOptions,
  ): Promise<Result<LoginRedirect, SsoError>> {
    const discoveryResult = await fetchOidcDiscovery(this.oidcConfig.issuer);
    if (!discoveryResult.ok) {
      return err(new SsoError("OIDC discovery failed", discoveryResult.error));
    }

    const { discovery } = discoveryResult.value;
    const nonce = newId("nonce");
    const state = Buffer.from(
      JSON.stringify({
        nonce,
        relayState: options.relayState ?? "",
        loginHint: options.loginHint,
      }),
    ).toString("base64");

    const scopes = (this.oidcConfig.scopes ?? DEFAULT_SCOPES).join(" ");
    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.oidcConfig.clientId);
    url.searchParams.set("redirect_uri", this.oidcConfig.redirectUri);
    url.searchParams.set("scope", scopes);
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);

    if (options.loginHint) {
      url.searchParams.set("login_hint", options.loginHint);
    }
    if (options.forceReauth) {
      url.searchParams.set("prompt", "login");
    }

    return ok({ redirectUrl: url.toString(), state });
  }

  async handleCallback(
    params: CallbackParams,
    storedState: string,
  ): Promise<Result<CallbackResult, SsoError>> {
    if (params["error"]) {
      return err(
        new SsoError(`IdP returned error: ${params["error"]} — ${params["error_description"] ?? ""}`),
      );
    }

    const code = params["code"];
    if (!code) {
      return err(new SsoError("Missing authorization code in OIDC callback"));
    }

    const returnedState = params["state"];
    if (!returnedState || returnedState !== storedState) {
      return err(new SsoError("OIDC state parameter mismatch"));
    }

    let storedNonce: string | undefined;
    try {
      const decoded = JSON.parse(
        Buffer.from(storedState, "base64").toString("utf-8"),
      ) as unknown;
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "nonce" in decoded &&
        typeof (decoded as Record<string, unknown>)["nonce"] === "string"
      ) {
        storedNonce = (decoded as Record<string, string>)["nonce"];
      }
    } catch {
      return err(new SsoError("Failed to parse stored OIDC state"));
    }

    const discoveryResult = await fetchOidcDiscovery(this.oidcConfig.issuer);
    if (!discoveryResult.ok) {
      return err(new SsoError("OIDC discovery failed during token exchange", discoveryResult.error));
    }

    const { discovery } = discoveryResult.value;

    const tokenRes = await this.exchangeCode(code, discovery.token_endpoint);
    if (!tokenRes.ok) return tokenRes;

    const { idToken } = tokenRes.value;
    const payloadResult = decodeJwtPayload(idToken);
    if (!payloadResult.ok) return payloadResult;

    const claims = payloadResult.value;

    if (
      storedNonce &&
      typeof claims["nonce"] === "string" &&
      claims["nonce"] !== storedNonce
    ) {
      return err(new SsoError("OIDC nonce mismatch — possible replay attack"));
    }

    const attrs = claimsToAttributes(claims);
    const mapResult = mapAttributes(attrs, this.effectiveMap);
    if (!mapResult.ok) {
      return err(new SsoError(`Attribute mapping failed: ${mapResult.error.message}`));
    }

    return ok({
      principal: mapResult.value,
      providerId: this.config.id,
      sessionIndex: undefined,
    });
  }

  async resolvePrincipal(
    result: CallbackResult,
  ): Promise<Result<SsoPrincipal, SsoError>> {
    return ok(result.principal);
  }

  async healthCheck(): Promise<Result<void, SsoError>> {
    const result = await fetchOidcDiscovery(this.oidcConfig.issuer);
    if (!result.ok) {
      return err(new SsoError("OIDC health check failed", result.error));
    }
    return ok(undefined);
  }

  private async exchangeCode(
    code: string,
    tokenEndpoint: string,
  ): Promise<Result<{ idToken: string; accessToken: string }, TokenExchangeError>> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.oidcConfig.redirectUri,
      client_id: this.oidcConfig.clientId,
      client_secret: this.oidcConfig.clientSecret,
    });

    let res: Response;
    try {
      res = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (cause) {
      return err(new TokenExchangeError("Network error contacting token endpoint", cause));
    }

    if (!res.ok) {
      return err(new TokenExchangeError(`Token endpoint returned HTTP ${res.status}`));
    }

    const json = (await res.json()) as unknown;
    if (
      typeof json !== "object" ||
      json === null ||
      !("id_token" in json) ||
      !("access_token" in json)
    ) {
      return err(new TokenExchangeError("Unexpected token response shape"));
    }

    const tokenData = json as Record<string, unknown>;
    const idToken = tokenData["id_token"];
    const accessToken = tokenData["access_token"];

    if (typeof idToken !== "string" || typeof accessToken !== "string") {
      return err(new TokenExchangeError("id_token or access_token is not a string"));
    }

    return ok({ idToken, accessToken });
  }
}
