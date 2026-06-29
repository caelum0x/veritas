// Plugin runtime context injected into every plugin lifecycle call.

import type { Logger } from "@veritas/core";
import type { CapabilityKind } from "./capability.js";
import type { HostApi } from "./host-api.js";
import type { SandboxPolicy } from "./sandbox.js";

/**
 * Immutable runtime context provided by the host to the plugin on every
 * lifecycle call. Plugins must NOT store mutable references to this object.
 */
export interface PluginContext {
  /** Unique plugin instance id assigned by the registry at load time. */
  readonly instanceId: string;
  /** Plugin-scoped structured logger (bindings include instanceId). */
  readonly logger: Logger;
  /** API surface the host exposes to the plugin for platform integration. */
  readonly hostApi: HostApi;
  /** Active sandbox policy governing what the plugin may do at runtime. */
  readonly policy: SandboxPolicy;
  /** Set of capability kinds the host has explicitly granted to this plugin. */
  readonly grantedCapabilities: ReadonlySet<CapabilityKind>;
  /** Opaque per-plugin configuration blob validated at load time. */
  readonly config: Readonly<Record<string, unknown>>;
  /** ISO-8601 timestamp when this plugin instance was activated. */
  readonly activatedAt: string;
}

/** Return true if the plugin context grants the requested capability. */
export function hasCapability(ctx: PluginContext, kind: CapabilityKind): boolean {
  return ctx.grantedCapabilities.has(kind);
}

/** Derive a child context with additional logger bindings. */
export function childContext(
  ctx: PluginContext,
  bindings: Readonly<Record<string, unknown>>,
): PluginContext {
  return { ...ctx, logger: ctx.logger.child(bindings) };
}
