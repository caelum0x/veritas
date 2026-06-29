// Permission check helpers for validating scopes and access control

import { Result, ok, err } from "@veritas/core";
import type { Scope } from "./scopes.js";
import { scopeImplies } from "./scopes.js";
import type { Principal } from "./principal.js";

export interface PermissionCheckResult {
  readonly allowed: boolean;
  readonly missingScopes: Scope[];
}

export function hasScope(principal: Principal, required: Scope): boolean {
  return principal.scopes.some((granted) => scopeImplies(granted, required));
}

export function hasAllScopes(principal: Principal, required: readonly Scope[]): PermissionCheckResult {
  const missingScopes = required.filter((s) => !hasScope(principal, s));
  return { allowed: missingScopes.length === 0, missingScopes };
}

export function hasAnyScope(principal: Principal, required: readonly Scope[]): boolean {
  return required.some((s) => hasScope(principal, s));
}

export function requireScope(principal: Principal, required: Scope): Result<void, string> {
  if (!hasScope(principal, required)) {
    return err(`Missing required scope: ${required}`);
  }
  return ok(undefined);
}

export function requireAllScopes(principal: Principal, required: readonly Scope[]): Result<void, string> {
  const { allowed, missingScopes } = hasAllScopes(principal, required);
  if (!allowed) {
    return err(`Missing required scopes: ${missingScopes.join(", ")}`);
  }
  return ok(undefined);
}

export function requireAnyScope(principal: Principal, required: readonly Scope[]): Result<void, string> {
  if (!hasAnyScope(principal, required)) {
    return err(`At least one of these scopes is required: ${required.join(", ")}`);
  }
  return ok(undefined);
}

export function isOrgMember(principal: Principal, orgId: string): boolean {
  return principal.orgId === orgId;
}

export function requireOrgAccess(principal: Principal, orgId: string): Result<void, string> {
  if (!isOrgMember(principal, orgId)) {
    return err(`Access denied: principal does not belong to organization ${orgId}`);
  }
  return ok(undefined);
}
