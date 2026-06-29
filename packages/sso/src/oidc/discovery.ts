// Fetches and caches OIDC provider discovery document from the well-known endpoint.

import { z } from "zod";
import { ok, err, type Result, tryAsync } from "@veritas/core";
import { SsoError } from "../errors.js";

const OidcDiscoverySchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  userinfo_endpoint: z.string().url().optional(),
  jwks_uri: z.string().url(),
  response_types_supported: z.array(z.string()),
  subject_types_supported: z.array(z.string()),
  id_token_signing_alg_values_supported: z.array(z.string()),
  scopes_supported: z.array(z.string()).optional(),
  claims_supported: z.array(z.string()).optional(),
  end_session_endpoint: z.string().url().optional(),
  token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
});

export type OidcDiscovery = z.infer<typeof OidcDiscoverySchema>;

export interface JwksKey {
  readonly kty: string;
  readonly kid?: string;
  readonly use?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
  readonly x?: string;
  readonly y?: string;
  readonly crv?: string;
}

const JwksSchema = z.object({
  keys: z.array(
    z.object({
      kty: z.string(),
      kid: z.string().optional(),
      use: z.string().optional(),
      alg: z.string().optional(),
      n: z.string().optional(),
      e: z.string().optional(),
      x: z.string().optional(),
      y: z.string().optional(),
      crv: z.string().optional(),
    })
  ),
});

export interface DiscoveryCache {
  readonly discovery: OidcDiscovery;
  readonly jwks: readonly JwksKey[];
  readonly fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, DiscoveryCache>();

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new SsoError(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json() as Promise<unknown>;
}

/** Fetch OIDC discovery document and JWKS, with in-memory TTL cache. */
export async function fetchOidcDiscovery(
  issuer: string,
  nowMs: number = Date.now()
): Promise<Result<DiscoveryCache, SsoError>> {
  const cached = cache.get(issuer);
  if (cached !== undefined && nowMs - cached.fetchedAt < CACHE_TTL_MS) {
    return ok(cached);
  }

  const wellKnown = issuer.replace(/\/$/, "") + "/.well-known/openid-configuration";

  const rawDiscovery = await tryAsync(() => fetchJson(wellKnown));
  if (!rawDiscovery.ok) {
    return err(new SsoError("Failed to fetch OIDC discovery document", rawDiscovery.error));
  }

  const parsed = OidcDiscoverySchema.safeParse(rawDiscovery.value);
  if (!parsed.success) {
    return err(new SsoError("Invalid OIDC discovery document shape", parsed.error));
  }

  const discovery = parsed.data;

  const rawJwks = await tryAsync(() => fetchJson(discovery.jwks_uri));
  if (!rawJwks.ok) {
    return err(new SsoError("Failed to fetch JWKS", rawJwks.error));
  }

  const parsedJwks = JwksSchema.safeParse(rawJwks.value);
  if (!parsedJwks.success) {
    return err(new SsoError("Invalid JWKS shape", parsedJwks.error));
  }

  const entry: DiscoveryCache = {
    discovery,
    jwks: parsedJwks.data.keys,
    fetchedAt: nowMs,
  };

  cache.set(issuer, entry);
  return ok(entry);
}

/** Evict a cached discovery entry (e.g. after key rotation). */
export function evictDiscoveryCache(issuer: string): void {
  cache.delete(issuer);
}
