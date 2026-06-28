// Policy model: ordered allow/deny rules evaluated by the enforcer.
import { z } from "zod";
import { Permission, rawPermission } from "./permission.js";
import { RoleId, roleId } from "./role.js";

export type PolicyEffect = "allow" | "deny";

export interface PolicyRule {
  readonly effect: PolicyEffect;
  /** Glob-style permission string, e.g. "report:*" or "claim:read". */
  readonly permission: Permission;
  /** Optional resource-instance constraint (undefined = any). */
  readonly resourceId?: string;
  /** Optional condition expression (reserved for future CEL evaluation). */
  readonly condition?: string;
}

export interface Policy {
  readonly id: string;
  readonly roleId: RoleId;
  readonly description: string;
  readonly rules: readonly PolicyRule[];
}

const policyEffectSchema = z.enum(["allow", "deny"]);

const policyRuleSchema = z.object({
  effect: policyEffectSchema,
  permission: z.string().transform(rawPermission),
  resourceId: z.string().optional(),
  condition: z.string().optional(),
});

export const policySchema = z.object({
  id: z.string().min(1),
  roleId: z.string().min(1).transform(roleId),
  description: z.string(),
  rules: z.array(policyRuleSchema),
});

export type PolicyInput = z.input<typeof policySchema>;

/** Parse and validate a raw policy object. */
export function parsePolicy(raw: unknown): Policy {
  return policySchema.parse(raw) as unknown as Policy;
}

/** Merge multiple rule arrays for a set of effective roles into a single ordered list. */
export function mergePolicyRules(
  policies: readonly Policy[],
  effectiveRoleIds: ReadonlySet<RoleId>
): readonly PolicyRule[] {
  return policies
    .filter((p) => effectiveRoleIds.has(p.roleId))
    .flatMap((p) => p.rules);
}
