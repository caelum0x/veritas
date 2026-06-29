// Plugin lifecycle manager — coordinates init, activate, and dispose transitions.
import { ok, err, type Result } from "@veritas/core";
import type { VerifierPlugin } from "./plugin.js";
import type { PluginContext } from "./context.js";
import { PluginLifecycleError } from "./errors.js";
import type { PluginStatus } from "./types.js";

/** Snapshot of a plugin's lifecycle state. */
export interface LifecycleStatus {
  readonly pluginId: string;
  readonly state: PluginStatus;
  readonly errorMessage?: string;
}

/** Per-plugin lifecycle state map (module-scoped, reset via resetLifecycleState). */
const stateMap = new Map<string, PluginStatus>();

function getState(id: string): PluginStatus {
  return stateMap.get(id) ?? "unloaded";
}

function setState(id: string, state: PluginStatus): void {
  stateMap.set(id, state);
}

/** Initialize a plugin, transitioning from "unloaded" → "initialized". */
export async function initPlugin(
  plugin: VerifierPlugin,
  ctx: PluginContext,
): Promise<Result<void>> {
  const current = getState(plugin.id);
  if (current !== "unloaded") {
    return err(
      new PluginLifecycleError(
        plugin.id,
        `Cannot initialize from state "${current}"`,
      ),
    );
  }
  const result = await plugin.initialize(ctx);
  setState(plugin.id, result.ok ? "initialized" : "error");
  return result;
}

/** Activate a plugin, transitioning from "initialized" → "active". */
export async function activatePlugin(
  plugin: VerifierPlugin,
  ctx: PluginContext,
): Promise<Result<void>> {
  const current = getState(plugin.id);
  if (current !== "initialized") {
    return err(
      new PluginLifecycleError(
        plugin.id,
        `Cannot activate from state "${current}"`,
      ),
    );
  }
  const result = await plugin.activate(ctx);
  setState(plugin.id, result.ok ? "active" : "error");
  return result;
}

/** Dispose a plugin, transitioning it to "disposed". Always resolves ok. */
export async function disposePlugin(plugin: VerifierPlugin): Promise<Result<void>> {
  if (getState(plugin.id) === "disposed") {
    return ok(undefined);
  }
  try {
    await plugin.dispose();
    setState(plugin.id, "disposed");
    return ok(undefined);
  } catch (e) {
    setState(plugin.id, "error");
    return err(
      new PluginLifecycleError(
        plugin.id,
        `Dispose threw: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}

/** Return the current lifecycle status for a plugin. */
export function getLifecycleStatus(plugin: VerifierPlugin): LifecycleStatus {
  return { pluginId: plugin.id, state: getState(plugin.id) };
}

/** Reset lifecycle tracking for a plugin (useful for testing / hot-reload). */
export function resetLifecycleState(pluginId: string): void {
  stateMap.delete(pluginId);
}

/** Return true if the plugin is currently in the "active" state. */
export function isActive(plugin: VerifierPlugin): boolean {
  return getState(plugin.id) === "active";
}
