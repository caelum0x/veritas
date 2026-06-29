// Scope enum and helpers for Veritas authorization (verify:read, verify:write, billing:read, ...)

export const Scope = {
  VERIFY_READ: "verify:read",
  VERIFY_WRITE: "verify:write",
  BILLING_READ: "billing:read",
  BILLING_WRITE: "billing:write",
  SOURCES_READ: "sources:read",
  SOURCES_WRITE: "sources:write",
  REPORTS_READ: "reports:read",
  REPORTS_WRITE: "reports:write",
  ADMIN_READ: "admin:read",
  ADMIN_WRITE: "admin:write",
  WEBHOOKS_READ: "webhooks:read",
  WEBHOOKS_WRITE: "webhooks:write",
  AUDIT_READ: "audit:read",
} as const;

export type Scope = (typeof Scope)[keyof typeof Scope];

export const ALL_SCOPES: readonly Scope[] = Object.values(Scope) as Scope[];

export const READ_SCOPES: readonly Scope[] = ALL_SCOPES.filter((s) => s.endsWith(":read"));
export const WRITE_SCOPES: readonly Scope[] = ALL_SCOPES.filter((s) => s.endsWith(":write"));

export function isScope(value: unknown): value is Scope {
  return typeof value === "string" && ALL_SCOPES.includes(value as Scope);
}

export function parseScope(raw: string): Scope | undefined {
  return isScope(raw) ? raw : undefined;
}

export function parseScopes(raws: readonly string[]): Scope[] {
  return raws.filter(isScope);
}

export function scopeImplies(granted: Scope, required: Scope): boolean {
  if (granted === required) return true;
  const [grantedDomain] = granted.split(":");
  const [requiredDomain, requiredAction] = required.split(":");
  if (grantedDomain !== requiredDomain) return false;
  // write scope implies read scope for same domain
  if (requiredAction === "read") {
    return granted === (`${grantedDomain}:write` as Scope);
  }
  return false;
}
