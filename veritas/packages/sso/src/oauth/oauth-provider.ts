// OAuth2 authorization-code provider implementing the IdP provider port.

import { z } from "zod";
import { ok, err, type Result, newId } from "@veritas/core";
import { SsoError, TokenExchangeError } from "../errors.js";
import { exchangeCodeForTokens, decodeIdTokenClaims } from "../oidc/token.js";

export const OAuthProviderConfigSchema = z.object({
  providerId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  authorizationEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  userinfoEndpoint: z.string().url().optional(),
  scopes: z.array(z.string()).default(["openid", "email", "profile"]),
  redirectUri: z.string().url(),
  /** Extra query params appended to the authorization URL. */
  extraParams: z.record(z.string()).default({}),
});

export type OAuthProviderConfig = z.infer<typeof OAuthProviderConfigSchema>;

export interface OAuthAuthorizationParams {
  readonly state: string;
  readonly codeChallenge?: string;
  readonly codeChallengeMethod?: string;
  readonly loginHint?: string;
}

export interface OAuthCallbackParams {
  readonly code: string;
  readonly state: string;
  readonly codeVerifier?: string;
}

/** Normalised identity resolved from an OAuth2 callback. */
export interface OAuthIdentity {
  readonly id: string;
  readonly providerId: string;
  readonly externalId: string;
  readonly email: string | undefined;
  readonly emailVerified: boolean;
  readonly displayName: string | undefined;
  readonly givenName: string | undefined;
  readonly familyName: string | undefined;
  readonly avatarUrl: string | undefined;
  readonly rawAttributes: Readonly<Record<string, unknown>>;
  readonly accessToken: string;
}

/** Raw OAuth2 userinfo response shape. */
const UserinfoSchema = z.object({
  sub: z.string(),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().optional(),
}).passthrough();

type UserinfoResponse = z.infer<typeof UserinfoSchema>;

export class OAuthProvider {
  readonly providerId: string;

  constructor(private readonly config: OAuthProviderConfig) {
    this.providerId = config.providerId;
  }

  /** Build the authorization redirect URL. */
  buildAuthorizationUrl(params: OAuthAuthorizationParams): string {
    const qs = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(" "),
      state: params.state,
      ...this.config.extraParams,
    });

    if (params.loginHint !== undefined) {
      qs.set("login_hint", params.loginHint);
    }
    if (params.codeChallenge !== undefined) {
      qs.set("code_challenge", params.codeChallenge);
      qs.set("code_challenge_method", params.codeChallengeMethod ?? "S256");
    }

    return `${this.config.authorizationEndpoint}?${qs.toString()}`;
  }

  /** Exchange authorization code for tokens and resolve the user identity. */
  async handleCallback(
    params: OAuthCallbackParams
  ): Promise<Result<OAuthIdentity, SsoError | TokenExchangeError>> {
    const tokenResult = await exchangeCodeForTokens({
      tokenEndpoint: this.config.tokenEndpoint,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code: params.code,
      redirectUri: this.config.redirectUri,
      codeVerifier: params.codeVerifier,
    });

    if (!tokenResult.ok) {
      return err(tokenResult.error);
    }

    const tokens = tokenResult.value;

    if (this.config.userinfoEndpoint !== undefined) {
      const infoResult = await this.fetchUserinfo(
        this.config.userinfoEndpoint,
        tokens.access_token
      );
      if (!infoResult.ok) return err(infoResult.error);
      return ok(this.toIdentity(infoResult.value, tokens.access_token));
    }

    if (tokens.id_token !== undefined) {
      const claimsResult = decodeIdTokenClaims(tokens.id_token);
      if (!claimsResult.ok) return err(claimsResult.error);
      const c = claimsResult.value;
      return ok(
        this.toIdentity(
          {
            sub: c.sub,
            email: typeof c.email === "string" ? c.email : undefined,
            email_verified: typeof c.email_verified === "boolean" ? c.email_verified : undefined,
            name: typeof c.name === "string" ? c.name : undefined,
            given_name: typeof c.given_name === "string" ? c.given_name : undefined,
            family_name: typeof c.family_name === "string" ? c.family_name : undefined,
            picture: typeof c.picture === "string" ? c.picture : undefined,
          } as UserinfoResponse,
          tokens.access_token
        )
      );
    }

    return err(new SsoError("No userinfo endpoint and no id_token in response"));
  }

  private async fetchUserinfo(
    endpoint: string,
    accessToken: string
  ): Promise<Result<UserinfoResponse, SsoError>> {
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        return err(new SsoError(`Userinfo HTTP ${res.status}`));
      }
      const raw: unknown = await res.json();
      const parsed = UserinfoSchema.safeParse(raw);
      if (!parsed.success) {
        return err(new SsoError("Unexpected userinfo response shape", parsed.error));
      }
      return ok(parsed.data);
    } catch (cause) {
      return err(new SsoError("Failed to fetch userinfo", cause));
    }
  }

  private toIdentity(info: UserinfoResponse, accessToken: string): OAuthIdentity {
    return {
      id: newId("oauth"),
      providerId: this.providerId,
      externalId: info.sub,
      email: info.email,
      emailVerified: info.email_verified ?? false,
      displayName: info.name,
      givenName: info.given_name,
      familyName: info.family_name,
      avatarUrl: info.picture,
      rawAttributes: info as Readonly<Record<string, unknown>>,
      accessToken,
    };
  }
}

/** Factory to create an OAuthProvider from raw config input. */
export function createOAuthProvider(
  raw: unknown
): Result<OAuthProvider, SsoError> {
  const parsed = OAuthProviderConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new SsoError("Invalid OAuth provider config", parsed.error));
  }
  return ok(new OAuthProvider(parsed.data));
}
