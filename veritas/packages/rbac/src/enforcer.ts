// Policy enforcer: evaluates RBAC rules and returns allow/deny decisions.
import { Result, ok, err } from "@veritas/core";
import { Permission, permissionMatches } from "./permission.js";
import { Policy, PolicyRule, mergePolicyRules } from "./policy.js";
import { RoleId, resolveInheritedRoles, BUILT_IN_ROLE_MAP, Role, roleId } from "./role.js";
import { AuthzSubject } from "./subject.js";
import { ResourceDescriptor } from "./resource.js";
import { PermissionDeniedError } from "./errors.js";

export interface EnforcerOptions {
  /** All loaded policies. */
  readonly policies: readonly Policy[];
  /** Optional override role map (defaults to built-in). */
  readonly roleMap?: ReadonlyMap<RoleId, Role>;
}

export interface EvaluationContext {
  readonly subject: AuthzSubject;
  readonly permission: Permission;
  readonly resource?: ResourceDescriptor;
}

export type Decision = "allow" | "deny";

export interface EvaluationResult {
  readonly decision: Decision;
  readonly matchedRule?: PolicyRule;
  readonly reason: string;
}

/** Returns ok(EvaluationResult) or err(PermissionDeniedError) on hard failures. */
export function evaluate(
  ctx: EvaluationContext,
  opts: EnforcerOptions
): Result<EvaluationResult, PermissionDeniedError> {
  const roleMap = opts.roleMap ?? BUILT_IN_ROLE_MAP;

  const effectiveRoles = new Set<RoleId>();
  for (const rid of ctx.subject.roles) {
    for (const inherited of resolveInheritedRoles(roleId(rid), roleMap)) {
      effectiveRoles.add(inherited);
    }
  }

  const rules = mergePolicyRules(opts.policies, effectiveRoles);

  // Deny-overrides: explicit deny rules win.
  for (const rule of rules) {
    if (rule.effect !== "deny") continue;
    if (!permissionMatches(ctx.permission, rule.permission)) continue;
    if (rule.resourceId !== undefined && ctx.resource?.id !== rule.resourceId) continue;
    return ok({
      decision: "deny",
      matchedRule: rule,
      reason: `Explicit deny on permission "${String(rule.permission)}"`,
    });
  }

  // First matching allow rule wins.
  for (const rule of rules) {
    if (rule.effect !== "allow") continue;
    if (!permissionMatches(ctx.permission, rule.permission)) continue;
    if (rule.resourceId !== undefined && ctx.resource?.id !== rule.resourceId) continue;
    return ok({
      decision: "allow",
      matchedRule: rule,
      reason: `Allowed by policy rule on permission "${String(rule.permission)}"`,
    });
  }

  return ok({
    decision: "deny",
    reason: "No matching allow rule found (implicit deny).",
  });
}

/** Convenience: returns Ok(true) if allowed, Err(PermissionDeniedError) if denied. */
export function enforce(
  ctx: EvaluationContext,
  opts: EnforcerOptions
): Result<true, PermissionDeniedError> {
  const result = evaluate(ctx, opts);
  if (!result.ok) return result;
  if (result.value.decision === "allow") return ok(true);
  return err(
    new PermissionDeniedError(
      String(ctx.permission),
      String(ctx.subject.userId),
      ctx.resource?.type
    )
  );
}
