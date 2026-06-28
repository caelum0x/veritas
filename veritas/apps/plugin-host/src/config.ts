// Plugin host configuration schema and defaults.
import { z } from "zod";
import { sandboxPolicySchema, openDevPolicy } from "@veritas/plugin-sdk";

/** Configuration for a single plugin entry in the host config. */
export const pluginEntrySchema = z.object({
  /** Module specifier (package name, file path, or URL). */
  specifier: z.string().min(1),
  /** Whether this plugin is enabled (default true). */
  enabled: z.boolean().default(true),
  /** Per-plugin sandbox policy override; falls back to host default. */
  policy: sandboxPolicySchema.optional(),
  /** Arbitrary plugin-specific config blob. */
  config: z.record(z.unknown()).default({}),
});

export type PluginEntry = z.infer<typeof pluginEntrySchema>;

/** Root plugin host configuration schema. */
export const pluginHostConfigSchema = z.object({
  /** Host API version string (semver). */
  hostVersion: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
  /** Plugin entries to load on startup. */
  plugins: z.array(pluginEntrySchema).default([]),
  /** Default sandbox policy applied to plugins without an explicit override. */
  defaultPolicy: sandboxPolicySchema.default(() => openDevPolicy()),
  /** Maximum concurrent verify() calls across all plugins. */
  maxConcurrentVerifications: z.number().int().positive().default(10),
  /** Whether to continue loading remaining plugins if one fails. */
  continueOnLoadError: z.boolean().default(true),
});

export type PluginHostConfig = z.infer<typeof pluginHostConfigSchema>;

/** Parse raw config input, throwing ZodError on failure. */
export function parsePluginHostConfig(raw: unknown): PluginHostConfig {
  return pluginHostConfigSchema.parse(raw);
}

/** Return a default development-mode host config. */
export function defaultPluginHostConfig(): PluginHostConfig {
  return pluginHostConfigSchema.parse({});
}
