// OIDC token exchange: converts authorization code to ID token and validates claims.

import { z } from "zod";
import { ok, err, type Result, tryAsync } from "@veritas/core";
import { TokenExchangeError } from "../errors.js";

const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  id_token: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type OidcTokenResponse = z.infer<typeof TokenResponseSchema>;

/** Decoded OIDC ID token claims (unverified — validate signature separately). */
export interface IdTokenClaims {
  readonly iss: string;
  readonly sub: string;
  readonly aud: string | readonly string[];
  readonly exp: number;
  readonly iat: number;
  readonly nonce?: string;
  readonly email?: string;
  readonly email_verified?: boolean;
  readonly name?: string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly picture?: string;
  readonly [key: string]: unknown;
}

export interface TokenExchangeParams {
  readonly tokenEndpoint: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUri: string;
  readonly codeVerifier?: string;
}

/** Exchange an authorization code for tokens at the OIDC token endpoint. */
export async function exchangeCodeForTokens(
  params: TokenExchangeParams
): Promise<Result<OidcTokenResponse, TokenExchangeError>> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
    ...(params.codeVerifier ? { code_verifier: params.codeVerifier } : {}),
  });

  const raw = await tryAsync(async () => {
    const res = await fetch(params.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new TokenExchangeError(`HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<unknown>;
  });

  if (!raw.ok) {
    const cause = raw.error;
    if (cause instanceof TokenExchangeError) return err(cause);
    return err(new TokenExchangeError("Network error during token exchange", cause));
  }

  const parsed = TokenResponseSchema.safeParse(raw.value);
  if (!parsed.success) {
    return err(new TokenExchangeError("Unexpected token response shape", parsed.error));
  }

  return ok(parsed.data);
}

/** Decode the JWT payload of an ID token without verifying the signature. */
export function decodeIdTokenClaims(
  idToken: string
): Result<IdTokenClaims, TokenExchangeError> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    return err(new TokenExchangeError("ID token is not a valid JWT"));
  }

  const payload = parts[1];
  if (payload === undefined) {
    return err(new TokenExchangeError("ID token payload segment is missing"));
  }

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as IdTokenClaims;
    return ok(claims);
  } catch (cause) {
    return err(new TokenExchangeError("Failed to decode ID token payload", cause));
  }
}

/** Validate standard OIDC claims (iss, aud, exp, nonce). */
export function validateIdTokenClaims(
  claims: IdTokenClaims,
  opts: {
    readonly expectedIssuer: string;
    readonly expectedClientId: string;
    readonly expectedNonce?: string;
    readonly nowSeconds?: number;
  }
): Result<IdTokenClaims, TokenExchangeError> {
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (claims.iss !== opts.expectedIssuer) {
    return err(new TokenExchangeError(`ID token issuer mismatch: got ${claims.iss}`));
  }

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(opts.expectedClientId)) {
    return err(new TokenExchangeError("ID token audience does not include clientId"));
  }

  if (claims.exp <= now) {
    return err(new TokenExchangeError("ID token has expired"));
  }

  if (opts.expectedNonce !== undefined && claims.nonce !== opts.expectedNonce) {
    return err(new TokenExchangeError("ID token nonce mismatch"));
  }

  return ok(claims);
}
