// Validate a raw unknown value against the PluginManifest schema, returning typed Results.
import { type Result, ok, err } from "@veritas/core";
import { pluginManifestSchema, type PluginManifest } from "./manifest.js";
import { PluginManifestError } from "./errors.js";

/**
 * Parse and validate an unknown value as a PluginManifest.
 * Returns Ok<PluginManifest> on success, Err<PluginManifestError> on failure.
 */
export function validateManifest(raw: unknown): Result<PluginManifest, PluginManifestError> {
  const parsed = pluginManifestSchema.safeParse(raw);
  if (parsed.success) {
    return ok(parsed.data);
  }
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return err(new PluginManifestError(`Invalid manifest — ${issues}`));
}

/**
 * Assert that the plugin's runtime id matches the id declared in its manifest.
 * Returns Ok<void> when they match, Err<PluginManifestError> otherwise.
 */
export function assertIdMatch(
  pluginId: string,
  manifest: PluginManifest,
): Result<void, PluginManifestError> {
  if (pluginId !== manifest.id) {
    return err(
      new PluginManifestError(
        `Plugin id mismatch: plugin.id="${pluginId}" but manifest.id="${manifest.id}"`,
      ),
    );
  }
  return ok(undefined);
}

/**
 * Validate that all declared capability tokens are non-empty strings.
 * Returns Ok<void> or Err<PluginManifestError> describing the first invalid token.
 */
export function validateCapabilities(
  capabilities: ReadonlyArray<string>,
): Result<void, PluginManifestError> {
  for (const cap of capabilities) {
    if (typeof cap !== "string" || cap.trim().length === 0) {
      return err(
        new PluginManifestError(
          `Capability token must be a non-empty string, got: ${String(cap)}`,
        ),
      );
    }
  }
  return ok(undefined);
}

/**
 * Run all manifest validations in sequence.
 * Convenience wrapper used by the registry before plugin activation.
 */
export function fullValidateManifest(
  raw: unknown,
  pluginId: string,
): Result<PluginManifest, PluginManifestError> {
  const manifestResult = validateManifest(raw);
  if (manifestResult.ok === false) return manifestResult;

  const manifest = manifestResult.value;

  const idCheck = assertIdMatch(pluginId, manifest);
  if (idCheck.ok === false) return idCheck;

  const capCheck = validateCapabilities(manifest.capabilities);
  if (capCheck.ok === false) return capCheck;

  return ok(manifest);
}
