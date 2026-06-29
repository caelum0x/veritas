// In-memory sandbox registry: CRUD operations and lookup by org or name
import { Result, ok, err, newId } from "@veritas/core";
import { Sandbox, SandboxSchema, CreateSandbox, SandboxTier, SandboxQuota } from "./types.js";
import {
  SandboxNotFoundError,
  SandboxAlreadyExistsError,
  SandboxRegistryError,
} from "./errors.js";

const TIER_QUOTAS: Record<SandboxTier, SandboxQuota> = {
  trial: {
    maxRequestsPerMinute: 60,
    maxRequestsPerDay: 1000,
    maxConcurrentRequests: 5,
    maxStorageMb: 100,
    maxWebhooks: 2,
  },
  developer: {
    maxRequestsPerMinute: 300,
    maxRequestsPerDay: 10000,
    maxConcurrentRequests: 20,
    maxStorageMb: 512,
    maxWebhooks: 10,
  },
  partner: {
    maxRequestsPerMinute: 1000,
    maxRequestsPerDay: 100000,
    maxConcurrentRequests: 50,
    maxStorageMb: 2048,
    maxWebhooks: 50,
  },
  enterprise: {
    maxRequestsPerMinute: 5000,
    maxRequestsPerDay: 1000000,
    maxConcurrentRequests: 200,
    maxStorageMb: 10240,
    maxWebhooks: 200,
  },
};

const sandboxById = new Map<string, Sandbox>();
const sandboxByOrg = new Map<string, Set<string>>();
const sandboxByName = new Map<string, string>(); // name -> id

export function createSandbox(
  input: CreateSandbox
): Result<Sandbox, SandboxAlreadyExistsError | SandboxRegistryError> {
  const nameKey = `${input.organizationId}::${input.name}`;
  if (sandboxByName.has(nameKey)) {
    return err(new SandboxAlreadyExistsError(input.name));
  }

  const tier = input.tier ?? "developer";
  const baseQuota = TIER_QUOTAS[tier];
  const quota: SandboxQuota = { ...baseQuota, ...input.quotaOverrides };
  const now = new Date().toISOString();
  const id = newId("sbx");

  const sandbox: Sandbox = SandboxSchema.parse({
    id,
    organizationId: input.organizationId,
    name: input.name,
    tier,
    status: "pending",
    quota,
    isolationToken: newId("tok"),
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  });

  sandboxById.set(id, sandbox);
  sandboxByName.set(nameKey, id);

  const orgSet = sandboxByOrg.get(input.organizationId) ?? new Set<string>();
  sandboxByOrg.set(input.organizationId, new Set([...orgSet, id]));

  return ok(sandbox);
}

export function getSandbox(
  sandboxId: string
): Result<Sandbox, SandboxNotFoundError> {
  const sandbox = sandboxById.get(sandboxId);
  if (sandbox === undefined) {
    return err(new SandboxNotFoundError(sandboxId));
  }
  return ok(sandbox);
}

export function updateSandbox(
  sandbox: Sandbox
): Result<Sandbox, SandboxNotFoundError> {
  if (!sandboxById.has(sandbox.id)) {
    return err(new SandboxNotFoundError(sandbox.id));
  }
  sandboxById.set(sandbox.id, sandbox);
  return ok(sandbox);
}

export function deleteSandbox(
  sandboxId: string
): Result<void, SandboxNotFoundError> {
  const sandbox = sandboxById.get(sandboxId);
  if (sandbox === undefined) {
    return err(new SandboxNotFoundError(sandboxId));
  }
  sandboxById.delete(sandboxId);

  const nameKey = `${sandbox.organizationId}::${sandbox.name}`;
  sandboxByName.delete(nameKey);

  const orgSet = sandboxByOrg.get(sandbox.organizationId);
  if (orgSet !== undefined) {
    const next = new Set([...orgSet].filter((id) => id !== sandboxId));
    sandboxByOrg.set(sandbox.organizationId, next);
  }

  return ok(undefined);
}

export function listSandboxesByOrg(organizationId: string): readonly Sandbox[] {
  const ids = sandboxByOrg.get(organizationId);
  if (ids === undefined) return [];
  return [...ids]
    .map((id) => sandboxById.get(id))
    .filter((s): s is Sandbox => s !== undefined);
}

export function findSandboxByName(
  organizationId: string,
  name: string
): Result<Sandbox, SandboxNotFoundError> {
  const nameKey = `${organizationId}::${name}`;
  const id = sandboxByName.get(nameKey);
  if (id === undefined) {
    return err(new SandboxNotFoundError(`${organizationId}/${name}`));
  }
  return getSandbox(id);
}

export function getDefaultQuotaForTier(tier: SandboxTier): SandboxQuota {
  return TIER_QUOTAS[tier];
}

export function getAllSandboxes(): readonly Sandbox[] {
  return [...sandboxById.values()];
}
