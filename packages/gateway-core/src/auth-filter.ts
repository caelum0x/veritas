// Auth filter: validates bearer tokens or API keys before routing upstream.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { Session, ApiKey } from "@veritas/contracts";

export interface AuthContext {
  readonly kind: "session" | "apikey";
  readonly subject: string;
  readonly organizationId: string | null;
  readonly scopes: ReadonlyArray<string>;
}

export interface AuthFilterConfig {
  readonly required: boolean;
  readonly allowedScopes?: ReadonlyArray<string>;
}

export type TokenVerifier = (token: string) => Promise<Result<Session, string>>;
export type ApiKeyVerifier = (raw: string) => Promise<Result<ApiKey, string>>;

export interface AuthFilterDeps {
  readonly verifyToken: TokenVerifier;
  readonly verifyApiKey: ApiKeyVerifier;
}

function extractBearer(authHeader: string): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  return match?.[1] ?? null;
}

function extractApiKey(headers: Readonly<Record<string, string>>): string | null {
  return headers["x-api-key"] ?? headers["X-Api-Key"] ?? null;
}

export async function runAuthFilter(
  headers: Readonly<Record<string, string>>,
  config: AuthFilterConfig,
  deps: AuthFilterDeps,
): Promise<Result<AuthContext | null, string>> {
  const authHeader = headers["authorization"] ?? headers["Authorization"];
  const apiKeyRaw = extractApiKey(headers);

  if (authHeader) {
    const token = extractBearer(authHeader);
    if (!token) return err("Malformed Authorization header");
    const result = await deps.verifyToken(token);
    if (!result.ok) return err(result.error);
    const session = result.value;
    const ctx: AuthContext = {
      kind: "session",
      subject: session.userId,
      organizationId: null,
      scopes: [],
    };
    return ok(ctx);
  }

  if (apiKeyRaw) {
    const result = await deps.verifyApiKey(apiKeyRaw);
    if (!result.ok) return err(result.error);
    const apiKey = result.value;
    const ctx: AuthContext = {
      kind: "apikey",
      subject: apiKey.id,
      organizationId: apiKey.organizationId,
      scopes: apiKey.scopes as string[],
    };
    if (config.allowedScopes && config.allowedScopes.length > 0) {
      const hasScope = config.allowedScopes.some((s) => ctx.scopes.includes(s));
      if (!hasScope) return err("Insufficient scopes");
    }
    return ok(ctx);
  }

  if (config.required) return err("Authentication required");
  return ok(null);
}
