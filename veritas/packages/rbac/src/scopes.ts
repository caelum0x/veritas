// Scope expansion: maps coarse OAuth-style scopes to granular permission strings.

/** A scope string like "reports:read" or "admin:*". */
export type Scope = string;

/** Map of scope -> expanded permission strings. */
const SCOPE_MAP: Readonly<Record<string, ReadonlyArray<string>>> = Object.freeze({
  "reports:read": ["report:read", "report:list"],
  "reports:write": ["report:read", "report:list", "report:create", "report:update"],
  "reports:delete": ["report:delete"],
  "reports:*": ["report:read", "report:list", "report:create", "report:update", "report:delete", "report:publish"],

  "orders:read": ["order:read", "order:list"],
  "orders:write": ["order:read", "order:list", "order:create", "order:cancel"],
  "orders:*": ["order:read", "order:list", "order:create", "order:cancel", "order:dispute"],

  "agents:read": ["agent:read", "agent:list"],
  "agents:write": ["agent:read", "agent:list", "agent:create", "agent:update"],
  "agents:*": ["agent:read", "agent:list", "agent:create", "agent:update", "agent:delete", "agent:invoke"],

  "billing:read": ["billing:read", "billing:list-invoices"],
  "billing:write": ["billing:read", "billing:list-invoices", "billing:manage-subscription"],
  "billing:*": ["billing:read", "billing:list-invoices", "billing:manage-subscription", "billing:manage-payment-methods"],

  "admin:*": [
    "admin:manage-users",
    "admin:manage-orgs",
    "admin:manage-plans",
    "admin:view-audit-logs",
    "admin:manage-agents",
    "admin:impersonate",
  ],

  "webhooks:read": ["webhook:read", "webhook:list"],
  "webhooks:write": ["webhook:read", "webhook:list", "webhook:create", "webhook:update", "webhook:delete"],

  "api-keys:read": ["api-key:read", "api-key:list"],
  "api-keys:write": ["api-key:read", "api-key:list", "api-key:create", "api-key:revoke"],

  "openid": ["profile:read"],
  "profile": ["profile:read", "profile:update"],
});

/**
 * Expand one scope string into its constituent permission strings.
 * Unknown scopes are returned as-is (passthrough).
 */
export function expandScope(scope: Scope): ReadonlyArray<string> {
  return SCOPE_MAP[scope] ?? [scope];
}

/**
 * Expand an array of scopes, deduplicating the resulting permissions.
 */
export function expandScopes(scopes: ReadonlyArray<Scope>): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const scope of scopes) {
    for (const perm of expandScope(scope)) {
      set.add(perm);
    }
  }
  return Object.freeze([...set]);
}

/** List all known scope strings. */
export function knownScopes(): ReadonlyArray<Scope> {
  return Object.freeze(Object.keys(SCOPE_MAP));
}
