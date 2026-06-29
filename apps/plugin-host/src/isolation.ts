// Isolation policy enforcement — decides what a loaded plugin is allowed to do.
import { ok, err, type Result } from "@veritas/core";
import {
  type SandboxPolicy,
  type CapabilityKind,
  InMemorySandboxEnforcer,
} from "@veritas/plugin-sdk";
import { IsolationViolationError } from "./errors.js";

/** Singleton in-process enforcer (stateless, safe to share). */
const enforcer = new InMemorySandboxEnforcer();

/** Check whether a capability is granted by the policy; returns ok or err. */
export function checkCapability(
  policy: SandboxPolicy,
  kind: CapabilityKind,
): Result<void> {
  if (enforcer.isGranted(policy, kind)) {
    return ok(undefined);
  }
  return err(
    new IsolationViolationError(
      `Capability "${kind}" not granted by sandbox policy`,
    ),
  );
}

/** Check whether a target hostname is permitted by the policy's network rules. */
export function checkHost(
  policy: SandboxPolicy,
  hostname: string,
): Result<void> {
  if (enforcer.isHostAllowed(policy, hostname)) {
    return ok(undefined);
  }
  return err(
    new IsolationViolationError(
      `Outbound connection to "${hostname}" is blocked by sandbox network policy`,
    ),
  );
}

/** Assert a capability is granted, returning err without throwing. */
export function assertCapabilityResult(
  policy: SandboxPolicy,
  kind: CapabilityKind,
): Result<void> {
  return checkCapability(policy, kind);
}

/** Return the set of granted CapabilityKind values from a policy. */
export function grantedCapabilitySet(
  policy: SandboxPolicy,
): ReadonlySet<CapabilityKind> {
  return new Set(policy.grantedCapabilities as CapabilityKind[]);
}

/** Merge two sandbox policies, taking the stricter quota / network constraints. */
export function mergePolicies(
  base: SandboxPolicy,
  override: Partial<SandboxPolicy>,
): SandboxPolicy {
  const merged: SandboxPolicy = {
    ...base,
    ...override,
    network: {
      allowedHosts:
        override.network?.allowedHosts ?? base.network.allowedHosts,
      maxConnections: Math.min(
        base.network.maxConnections,
        override.network?.maxConnections ?? base.network.maxConnections,
      ),
      requestTimeoutMs: Math.min(
        base.network.requestTimeoutMs,
        override.network?.requestTimeoutMs ?? base.network.requestTimeoutMs,
      ),
    },
    quota: {
      maxExecutionMs: Math.min(
        base.quota.maxExecutionMs,
        override.quota?.maxExecutionMs ?? base.quota.maxExecutionMs,
      ),
      maxMemoryBytes: Math.min(
        base.quota.maxMemoryBytes,
        override.quota?.maxMemoryBytes ?? base.quota.maxMemoryBytes,
      ),
      maxCallsPerMinute: Math.min(
        base.quota.maxCallsPerMinute,
        override.quota?.maxCallsPerMinute ?? base.quota.maxCallsPerMinute,
      ),
    },
  };
  return merged;
}
