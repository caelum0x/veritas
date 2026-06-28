// Plugin discovery — resolves plugin specifiers from config and the filesystem.
import { ok, err, type Result } from "@veritas/core";
import type { PluginEntry } from "./config.js";
import { PluginDiscoveryError } from "./errors.js";

/** A resolved plugin descriptor ready for loading. */
export interface DiscoveredPlugin {
  readonly specifier: string;
  readonly config: Readonly<Record<string, unknown>>;
  readonly policyOverride: unknown;
}

/**
 * Resolve which plugins should be loaded from the host configuration.
 * Filters out disabled entries and returns validated descriptors.
 */
export function discoverFromConfig(
  entries: ReadonlyArray<PluginEntry>,
): Result<ReadonlyArray<DiscoveredPlugin>> {
  const enabled = entries.filter((e) => e.enabled);

  if (enabled.length === 0) {
    return ok([]);
  }

  const discovered: DiscoveredPlugin[] = enabled.map((entry) => ({
    specifier: entry.specifier,
    config: Object.freeze({ ...entry.config }),
    policyOverride: entry.policy,
  }));

  return ok(discovered);
}

/**
 * Validate that a specifier string is non-empty and structurally plausible.
 * Does NOT perform I/O — purely structural validation.
 */
export function validateSpecifier(specifier: string): Result<string> {
  const trimmed = specifier.trim();
  if (trimmed.length === 0) {
    return err(new PluginDiscoveryError("Plugin specifier must not be empty"));
  }
  if (trimmed.includes(" ") && !trimmed.startsWith("file://")) {
    return err(
      new PluginDiscoveryError(
        `Plugin specifier "${trimmed}" contains spaces and is not a file:// URL`,
      ),
    );
  }
  return ok(trimmed);
}

/**
 * Merge a list of discovery results, short-circuiting on the first error.
 * Returns all discovered plugins as a flat array.
 */
export function mergeDiscoveryResults(
  results: ReadonlyArray<Result<ReadonlyArray<DiscoveredPlugin>>>,
): Result<ReadonlyArray<DiscoveredPlugin>> {
  const all: DiscoveredPlugin[] = [];
  for (const result of results) {
    if (!result.ok) return result;
    all.push(...result.value);
  }
  return ok(all);
}
