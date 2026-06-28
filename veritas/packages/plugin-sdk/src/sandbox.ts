// Sandbox policy port: governs what a plugin is permitted to do at runtime.

import { z } from "zod";
import type { CapabilityKind } from "./capability.js";

/** Network egress constraint applied to a plugin. */
export const networkPolicySchema = z.object({
  /** Allowlist of permitted hostname patterns (glob-style). Empty = deny all. */
  allowedHosts: z.array(z.string()),
  /** Maximum outbound connections open simultaneously. */
  maxConnections: z.number().int().positive().default(10),
  /** Timeout in milliseconds for each outbound HTTP request. */
  requestTimeoutMs: z.number().int().positive().default(10_000),
});

export type NetworkPolicy = z.infer<typeof networkPolicySchema>;

/** Resource quota applied to a plugin. */
export const resourceQuotaSchema = z.object({
  /** Maximum wall-clock execution time per verify() call in milliseconds. */
  maxExecutionMs: z.number().int().positive().default(30_000),
  /** Maximum heap bytes the plugin may allocate during a single run. */
  maxMemoryBytes: z.number().int().positive().default(128 * 1024 * 1024),
  /** Maximum number of verify() calls the plugin may make per minute. */
  maxCallsPerMinute: z.number().int().positive().default(60),
});

export type ResourceQuota = z.infer<typeof resourceQuotaSchema>;

/** Full sandbox policy assigned to a plugin instance by the host. */
export const sandboxPolicySchema = z.object({
  /** Capabilities the host has explicitly granted to this plugin. */
  grantedCapabilities: z.array(
    z.enum([
      "web_search",
      "llm_inference",
      "storage_access",
      "document_parse",
      "blockchain_write",
      "blockchain_read",
      "http_egress",
      "event_emit",
    ]),
  ),
  /** Network egress constraints. */
  network: networkPolicySchema,
  /** Resource usage quotas. */
  quota: resourceQuotaSchema,
  /** Whether the plugin is allowed to write to the host event bus. */
  allowEventEmit: z.boolean().default(false),
  /** Whether the plugin may read the runtime config of other plugins. */
  allowCrossPluginRead: z.boolean().default(false),
});

export type SandboxPolicy = z.infer<typeof sandboxPolicySchema>;

/** Port interface for enforcing the sandbox policy at runtime. */
export interface SandboxEnforcer {
  /** Return true if the requested capability is granted by the policy. */
  isGranted(policy: SandboxPolicy, kind: CapabilityKind): boolean;
  /** Return true if the target hostname is permitted by the network policy. */
  isHostAllowed(policy: SandboxPolicy, hostname: string): boolean;
  /** Assert that the policy permits the capability, throwing if denied. */
  assertGranted(policy: SandboxPolicy, kind: CapabilityKind): void;
}

/** In-process sandbox enforcer that performs pattern matching in memory. */
export class InMemorySandboxEnforcer implements SandboxEnforcer {
  isGranted(policy: SandboxPolicy, kind: CapabilityKind): boolean {
    return policy.grantedCapabilities.includes(kind);
  }

  isHostAllowed(policy: SandboxPolicy, hostname: string): boolean {
    return policy.network.allowedHosts.some((pattern) =>
      matchGlob(pattern, hostname),
    );
  }

  assertGranted(policy: SandboxPolicy, kind: CapabilityKind): void {
    if (!this.isGranted(policy, kind)) {
      throw new Error(`Plugin capability denied: ${kind}`);
    }
  }
}

/** Minimal glob matcher supporting "*" wildcards and exact matches. */
function matchGlob(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return pattern === value;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

/** Factory returning an open (allow-all) sandbox policy for development use. */
export function openDevPolicy(): SandboxPolicy {
  return sandboxPolicySchema.parse({
    grantedCapabilities: [
      "web_search",
      "llm_inference",
      "storage_access",
      "document_parse",
      "blockchain_read",
      "http_egress",
      "event_emit",
    ],
    network: { allowedHosts: ["*"], maxConnections: 20, requestTimeoutMs: 30_000 },
    quota: { maxExecutionMs: 60_000, maxMemoryBytes: 256 * 1024 * 1024, maxCallsPerMinute: 120 },
    allowEventEmit: true,
    allowCrossPluginRead: false,
  });
}
