// ApiKeyAuthenticator: authenticates requests using the veritas_sk_ API key scheme.

import { ok, err, type Result } from "@veritas/core";
import type { Authenticator, AuthContext } from "./authenticator.js";
import { parseApiKey } from "./api-key.js";
import type { ApiKeyHasher } from "./api-key-hasher.js";
import type { Principal } from "./principal.js";
import type { AuthError } from "./errors.js";
import { MissingCredentialsError, InvalidApiKeyError, IpDeniedError } from "./errors.js";
import { isIpAllowed } from "./ip-allowlist.js";
import { parseScopes } from "./scopes.js";
import type { UserId } from "@veritas/core";
import { asId } from "@veritas/core";

/** Minimal stored key record the key-store must return. */
export interface StoredApiKey {
  readonly keyId: string;
  readonly hashedSecret: string;
  readonly salt: string;
  readonly organizationId: string;
  readonly userId: string | undefined;
  readonly scopes: ReadonlyArray<string>;
  readonly allowedIps: ReadonlyArray<string> | undefined;
  readonly revokedAt: string | undefined;
}

/** Abstraction over the persistence layer for looking up API keys by prefix/id. */
export interface ApiKeyStore {
  findByKeyId(keyId: string): Promise<StoredApiKey | undefined>;
}

/** Extracts `veritas_sk_<keyId>_<secret>` from the Authorization header. */
function extractBearerToken(header: string | undefined): string | undefined {
  if (header == null) return undefined;
  const lower = header.toLowerCase();
  if (lower.startsWith("bearer ")) return header.slice(7).trim();
  if (lower.startsWith("apikey ")) return header.slice(7).trim();
  return undefined;
}

export class ApiKeyAuthenticator implements Authenticator {
  constructor(
    private readonly store: ApiKeyStore,
    private readonly hasher: ApiKeyHasher,
  ) {}

  async authenticate(ctx: AuthContext): Promise<Result<Principal, AuthError>> {
    const raw = extractBearerToken(ctx.authorizationHeader);
    if (raw == null) {
      return err(new MissingCredentialsError("Missing Authorization header"));
    }

    const parsedResult = parseApiKey(raw);
    if (!parsedResult.ok) {
      return err(new InvalidApiKeyError("Malformed API key format"));
    }
    const parsed = parsedResult.value;

    const stored = await this.store.findByKeyId(parsed.keyId);
    if (stored == null) {
      return err(new InvalidApiKeyError("API key not found"));
    }

    if (stored.revokedAt != null) {
      return err(new InvalidApiKeyError("API key has been revoked"));
    }

    const valid = this.hasher.verify(parsed, { hash: stored.hashedSecret, salt: stored.salt });
    if (!valid) {
      return err(new InvalidApiKeyError("API key secret does not match"));
    }

    if (stored.allowedIps != null && stored.allowedIps.length > 0) {
      const remoteIp = ctx.remoteIp ?? "";
      const allowlistResult = isIpAllowed(remoteIp, {
        allowedCidrs: stored.allowedIps,
        deniedCidrs: [],
      });
      if (!allowlistResult.ok || !allowlistResult.value) {
        return err(new IpDeniedError(remoteIp, "Remote IP not in allowlist"));
      }
    }

    const scopes = parseScopes(stored.scopes as string[]);
    const userId: UserId | undefined = stored.userId != null ? asId(stored.userId, "user") : undefined;

    const principal: Principal = {
      id: stored.keyId,
      kind: "api_key",
      userId,
      orgId: stored.organizationId,
      scopes,
      metadata: {},
    };

    return ok(principal);
  }
}
