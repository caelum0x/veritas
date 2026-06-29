// seed-data.ts: deterministic seed data for sandbox environments.

import { type Sandbox, type SandboxCredential } from "./types.js";

/** A fixed set of sandbox seed entries for consistent test/demo environments. */
export const SEED_SANDBOXES: readonly Omit<Sandbox, "isolationToken">[] = [
  {
    id: "seed_sandbox_001",
    organizationId: "seed_org_001",
    name: "Demo Sandbox",
    tier: "developer",
    status: "active",
    quota: {
      maxRequestsPerMinute: 100,
      maxRequestsPerDay: 10000,
      maxConcurrentRequests: 5,
      maxStorageMb: 500,
      maxWebhooks: 5,
    },
    metadata: { seeded: "true", purpose: "demo" },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "seed_sandbox_002",
    organizationId: "seed_org_002",
    name: "Partner Sandbox",
    tier: "partner",
    status: "active",
    quota: {
      maxRequestsPerMinute: 1000,
      maxRequestsPerDay: 100000,
      maxConcurrentRequests: 50,
      maxStorageMb: 5000,
      maxWebhooks: 25,
    },
    metadata: { seeded: "true", purpose: "partner-integration" },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

/** Pre-seeded credentials associated with seed sandboxes. */
export const SEED_CREDENTIALS: readonly SandboxCredential[] = [
  {
    id: "seed_cred_001",
    sandboxId: "seed_sandbox_001",
    kind: "api_key",
    key: "sk_sandbox_demo_key_00000000",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "seed_cred_002",
    sandboxId: "seed_sandbox_001",
    kind: "webhook_secret",
    key: "whsec_demo_secret_00000000",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "seed_cred_003",
    sandboxId: "seed_sandbox_002",
    kind: "api_key",
    key: "sk_sandbox_partner_key_00000000",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

/** Returns a shallow copy of seed sandboxes with a generated isolation token. */
export function getSeedSandboxes(): Sandbox[] {
  return SEED_SANDBOXES.map((s, i) => ({
    ...s,
    isolationToken: `seed_isolation_token_${String(i).padStart(3, "0")}`,
  }));
}

/** Returns all seed credentials as a readonly array. */
export function getSeedCredentials(): readonly SandboxCredential[] {
  return SEED_CREDENTIALS;
}
