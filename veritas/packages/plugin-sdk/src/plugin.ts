// VerifierPlugin interface — contract every plugin must satisfy.
import type { Result } from "@veritas/core";
import type { PluginManifest } from "./manifest.js";
import type { PluginContext } from "./context.js";
import type { PluginResult } from "./result.js";
import type { MetaRecord } from "./types.js";

/** Input passed to a plugin's verify method. */
export interface PluginVerifyInput {
  /** The raw claim text to verify. */
  readonly claim: string;
  /** Optional URL context provided by the caller. */
  readonly sourceUrl?: string;
  /** Caller-supplied metadata (arbitrary key-value pairs). */
  readonly meta: MetaRecord;
}

/** Core interface every verifier plugin must implement. */
export interface VerifierPlugin {
  /** Unique identifier matching the manifest id. */
  readonly id: string;

  /** Declarative metadata describing this plugin. */
  readonly manifest: PluginManifest;

  /**
   * Called once after the plugin is loaded into the host.
   * Perform async setup (network probing, cache warming, etc.) here.
   */
  initialize(ctx: PluginContext): Promise<Result<void>>;

  /**
   * Called when the plugin is activated for a verification run.
   * Must be idempotent — may be called multiple times across reloads.
   */
  activate(ctx: PluginContext): Promise<Result<void>>;

  /**
   * Execute the plugin's primary verification logic against the provided input.
   * Returns a PluginResult containing evidence, scores, and provenance data.
   */
  verify(input: PluginVerifyInput, ctx: PluginContext): Promise<Result<PluginResult>>;

  /**
   * Tear down resources and release handles.
   * Called on orderly shutdown or plugin unload.
   */
  dispose(): Promise<void>;
}
