// isolation.ts: sandbox isolation enforcement — namespace and partition management.

import { type Result, ok, err } from "@veritas/core";
import { type Sandbox } from "./types.js";
import { SandboxIsolationError } from "./errors.js";

export interface IsolationContext {
  readonly sandboxId: string;
  readonly namespace: string;
  readonly dataPartition: string;
  readonly networkLabel: string;
  readonly resourcePrefix: string;
}

/** Derives a deterministic isolation context from a sandbox. */
export function buildIsolationContext(sandbox: Readonly<Sandbox>): IsolationContext {
  const ns = `sandbox-${sandbox.id}`;
  return {
    sandboxId: sandbox.id,
    namespace: ns,
    dataPartition: `part_${sandbox.organizationId}_${sandbox.id}`,
    networkLabel: `net_${sandbox.tier}_${sandbox.id}`,
    resourcePrefix: `res_${sandbox.id}`,
  };
}

/** Validates that a resource name belongs to the expected sandbox namespace. */
export function assertIsolated(
  resourceName: string,
  context: IsolationContext,
): Result<void, SandboxIsolationError> {
  if (!resourceName.startsWith(context.resourcePrefix)) {
    return err(
      new SandboxIsolationError(
        `Resource "${resourceName}" does not belong to namespace "${context.namespace}"`,
      ),
    );
  }
  return ok(undefined);
}

/** Produces a namespaced resource identifier for use within a sandbox. */
export function namespacedId(context: IsolationContext, localId: string): string {
  return `${context.resourcePrefix}_${localId}`;
}

/** Strips the sandbox namespace prefix from a resource identifier. */
export function stripNamespace(
  context: IsolationContext,
  namespacedResourceId: string,
): Result<string, SandboxIsolationError> {
  const prefix = `${context.resourcePrefix}_`;
  if (!namespacedResourceId.startsWith(prefix)) {
    return err(
      new SandboxIsolationError(
        `Cannot strip namespace from "${namespacedResourceId}": unexpected prefix`,
      ),
    );
  }
  return ok(namespacedResourceId.slice(prefix.length));
}

/** Returns the isolation network policy descriptor string for a sandbox tier. */
export function networkPolicyDescriptor(sandbox: Readonly<Sandbox>): string {
  switch (sandbox.tier) {
    case "enterprise":
      return "policy:strict-egress,strict-ingress,dedicated-vpc";
    case "partner":
      return "policy:restricted-egress,allow-ingress,shared-vpc";
    case "developer":
      return "policy:open-egress,allow-ingress,shared-vpc";
    case "trial":
      return "policy:limited-egress,allow-ingress,shared-vpc";
    default:
      return "policy:limited-egress,allow-ingress,shared-vpc";
  }
}
