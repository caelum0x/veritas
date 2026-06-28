// Plugin hook point definitions for lifecycle and verification pipeline events.

import type { Result } from "@veritas/core";
import type { PluginContext } from "./context.js";
import type { PluginResult } from "./result.js";

/** Arguments delivered to the before-verify hook. */
export interface BeforeVerifyArgs {
  /** The raw claim text about to be verified. */
  readonly claim: string;
  /** Optional source URL accompanying the claim. */
  readonly sourceUrl?: string;
  /** Caller-supplied metadata key/value pairs. */
  readonly meta: Readonly<Record<string, string>>;
}

/** Arguments delivered to the after-verify hook. */
export interface AfterVerifyArgs {
  /** Original claim that was verified. */
  readonly claim: string;
  /** The result produced by the plugin's verify method. */
  readonly result: PluginResult;
}

/** Arguments delivered to the on-error hook. */
export interface OnErrorArgs {
  /** Phase in which the error occurred (e.g. "initialize", "verify"). */
  readonly phase: string;
  /** The thrown error or failure value. */
  readonly error: unknown;
}

/**
 * All hook points a plugin may optionally implement. The host calls each hook
 * at the corresponding moment in the verification lifecycle. Hooks must be
 * non-blocking — any async work should be fire-and-forget where possible.
 */
export interface PluginHooks {
  /**
   * Called just before the plugin's verify() method is invoked.
   * A failing result aborts the verification for this plugin.
   */
  beforeVerify(args: BeforeVerifyArgs, ctx: PluginContext): Promise<Result<void>>;

  /**
   * Called immediately after verify() returns a successful result.
   * Use for telemetry, caching, or result enrichment side-effects.
   */
  afterVerify(args: AfterVerifyArgs, ctx: PluginContext): Promise<void>;

  /**
   * Called whenever any lifecycle method throws or returns an Err.
   * Should be used for structured error reporting, not recovery.
   */
  onError(args: OnErrorArgs, ctx: PluginContext): Promise<void>;

  /**
   * Called when the host is about to unload this plugin.
   * Implementations should flush buffers and release external handles.
   */
  beforeDispose(ctx: PluginContext): Promise<void>;
}
