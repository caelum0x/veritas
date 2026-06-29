// Plugin registry — stores, looks up, and iterates registered plugins.
import { ok, err, type Result } from "@veritas/core";
import type { VerifierPlugin } from "./plugin.js";
import type { CapabilityToken } from "./types.js";
import { PluginNotFoundError, PluginAlreadyRegisteredError } from "./errors.js";

/** In-memory registry of loaded plugins, keyed by plugin id. */
const registry = new Map<string, VerifierPlugin>();

/** Register a plugin. Returns PluginAlreadyRegisteredError if the id is taken. */
export function registerPlugin(plugin: VerifierPlugin): Result<void> {
  if (registry.has(plugin.id)) {
    return err(new PluginAlreadyRegisteredError(plugin.id));
  }
  registry.set(plugin.id, plugin);
  return ok(undefined);
}

/** Unregister a plugin by id. Returns PluginNotFoundError if absent. */
export function unregisterPlugin(id: string): Result<void> {
  if (!registry.has(id)) {
    return err(new PluginNotFoundError(id));
  }
  registry.delete(id);
  return ok(undefined);
}

/** Retrieve a plugin by id. */
export function getPlugin(id: string): Result<VerifierPlugin> {
  const plugin = registry.get(id);
  if (plugin === undefined) {
    return err(new PluginNotFoundError(id));
  }
  return ok(plugin);
}

/** Return all registered plugins as an immutable array. */
export function listPlugins(): readonly VerifierPlugin[] {
  return [...registry.values()];
}

/** Return plugins that declare a specific capability token. */
export function pluginsWithCapability(
  capability: CapabilityToken,
): readonly VerifierPlugin[] {
  return listPlugins().filter((p) =>
    (p.manifest.capabilities as readonly string[]).includes(capability),
  );
}

/** Return true if a plugin with the given id is registered. */
export function hasPlugin(id: string): boolean {
  return registry.has(id);
}

/** Clear all registered plugins (useful for testing / hot-reload). */
export function clearRegistry(): void {
  registry.clear();
}
