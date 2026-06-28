// Derive a stable rate-limit bucket key from an authenticated principal or IP.

import type {
  Principal,
  ApiKeyPrincipal,
  SessionPrincipal,
  AgentPrincipal,
  ServicePrincipal,
} from "./principal.js";

/** Granularity of the rate limit bucket. */
export type RateLimitScope =
  | "global"        // per-key or per-user across all endpoints
  | "verify"        // verification-specific budget
  | "billing"       // billing endpoint budget
  | "admin";        // admin/management endpoint budget

/**
 * Derive a rate-limit key string for the given principal and scope.
 *
 * The key is designed to be:
 *  - Stable (same principal + scope always yields same key).
 *  - Collision-resistant (different principal kinds use distinct prefixes).
 *  - Human-readable for debugging in Redis / monitoring dashboards.
 *
 * Key formats:
 *  api-key   →  `ratelimit:org:<orgId>:key:<keyId>:<scope>`
 *  session   →  `ratelimit:org:<orgId>:user:<userId>:session:<scope>`
 *  anonymous →  `ratelimit:anon:ip:<ip>:<scope>`
 */
export function deriveRateLimitKey(
  principal: Principal | undefined,
  scope: RateLimitScope,
  remoteIp?: string,
): string {
  if (principal == null) {
    const ip = sanitizeIp(remoteIp ?? "unknown");
    return `ratelimit:anon:ip:${ip}:${scope}`;
  }

  switch (principal.kind) {
    case "api_key": {
      const p = principal as ApiKeyPrincipal;
      return `ratelimit:org:${p.orgId}:key:${p.apiKeyId}:${scope}`;
    }
    case "session": {
      const p = principal as SessionPrincipal;
      return `ratelimit:org:${p.orgId}:user:${p.userId}:session:${scope}`;
    }
    case "agent": {
      const p = principal as AgentPrincipal;
      return `ratelimit:org:${p.orgId}:agent:${p.agentId}:${scope}`;
    }
    case "service": {
      const p = principal as ServicePrincipal;
      return `ratelimit:org:${p.orgId}:service:${p.serviceName}:${scope}`;
    }
    default:
      // Exhaustive guard — if new principal kinds are added the compiler will flag this.
      return assertNeverPrincipal(principal as never, scope);
  }
}

/**
 * Derive the organisation-level rate-limit key (shared across all keys/users
 * in an org) for org-wide quota enforcement.
 */
export function deriveOrgRateLimitKey(
  organizationId: string,
  scope: RateLimitScope,
): string {
  return `ratelimit:org:${organizationId}:global:${scope}`;
}

/** Sanitize an IP address to be safe for use in Redis key names. */
function sanitizeIp(ip: string): string {
  // Replace colons (IPv6) with underscores so the key structure stays parseable.
  return ip.replace(/:/g, "_").replace(/[^a-zA-Z0-9._\-]/g, "x");
}

/** Runtime exhaustiveness helper — never reached if all principal kinds are handled. */
function assertNeverPrincipal(p: never, scope: RateLimitScope): string {
  const kind = (p as { kind: string }).kind ?? "unknown";
  return `ratelimit:unknown:${kind}:${scope}`;
}
