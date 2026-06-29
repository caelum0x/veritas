// sandbox.ts: sandbox environment definition and core orchestration.

import { type Result, ok, err, newId } from "@veritas/core";
import {
  type Sandbox,
  type CreateSandbox,
  SandboxSchema,
  CreateSandboxSchema,
} from "./types.js";
import { SandboxRegistryError } from "./errors.js";
import { TIER_QUOTAS } from "./quota.js";

/** Creates a new Sandbox from the given input, returning a validated Result. */
export function createSandbox(input: CreateSandbox): Result<Sandbox, SandboxRegistryError> {
  const parsed = CreateSandboxSchema.safeParse(input);
  if (!parsed.success) {
    return err(new SandboxRegistryError("Invalid sandbox configuration"));
  }

  const { organizationId, name, tier, quotaOverrides, metadata } = parsed.data;
  const baseQuota = TIER_QUOTAS[tier];
  const quota = quotaOverrides
    ? { ...baseQuota, ...quotaOverrides }
    : baseQuota;

  const now = new Date().toISOString();
  const sandbox: Sandbox = {
    id: newId("sbx"),
    organizationId,
    name,
    tier,
    status: "pending",
    quota,
    isolationToken: newId("tok"),
    metadata,
    createdAt: now,
    updatedAt: now,
  };

  const validated = SandboxSchema.safeParse(sandbox);
  if (!validated.success) {
    return err(new SandboxRegistryError("Failed to construct sandbox entity"));
  }

  return ok(validated.data);
}

/** Returns true if the sandbox is in an active and usable state. */
export function isSandboxActive(sandbox: Sandbox): boolean {
  return sandbox.status === "active";
}

/** Produces an updated sandbox with the provided patch (immutable). */
export function updateSandbox(
  sandbox: Readonly<Sandbox>,
  patch: Partial<Omit<Sandbox, "id" | "organizationId" | "createdAt">>,
): Sandbox {
  return {
    ...sandbox,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

/** Returns a loggable summary of the sandbox. */
export function describeSandbox(sandbox: Readonly<Sandbox>): Record<string, unknown> {
  return {
    id: sandbox.id,
    name: sandbox.name,
    tier: sandbox.tier,
    status: sandbox.status,
    organizationId: sandbox.organizationId,
    createdAt: sandbox.createdAt,
  };
}
