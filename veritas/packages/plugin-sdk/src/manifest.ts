// Plugin manifest schema — declarative metadata for every plugin.
import { z } from "zod";

/** Zod schema for a plugin manifest. */
export const pluginManifestSchema = z.object({
  /** Unique reverse-domain or kebab-case identifier, e.g. "com.example.my-verifier". */
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]([a-z0-9._:-]*[a-z0-9])?$/, "invalid plugin id"),
  /** Human-readable name. */
  name: z.string().min(1).max(64),
  /** Semver version string (X.Y.Z). */
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "must be semver (X.Y.Z)"),
  /** Short description (max 256 chars). */
  description: z.string().max(256).default(""),
  /** Author name or organisation. */
  author: z.string().max(128).default(""),
  /** SPDX license identifier. */
  license: z.string().max(64).default("MIT"),
  /** Capability tokens this plugin declares. */
  capabilities: z.array(z.string().min(1)).default([]),
  /** Minimum host API version required (semver). */
  minHostVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "must be semver (X.Y.Z)")
    .optional(),
  /** Whether the plugin runs in an isolated sandbox (defaults to true). */
  sandboxed: z.boolean().default(true),
  /** Plugin-specific configuration JSON Schema (arbitrary object). */
  configSchema: z.record(z.unknown()).optional(),
  /** Arbitrary tags for discovery. */
  tags: z.array(z.string()).default([]),
});

/** Inferred TypeScript type for PluginManifest. */
export type PluginManifest = z.infer<typeof pluginManifestSchema>;

/** Parse raw data into a PluginManifest, throwing a ZodError on failure. */
export function parseManifest(raw: unknown): PluginManifest {
  return pluginManifestSchema.parse(raw);
}

/** Parse raw data into a PluginManifest safely, returning a zod SafeParseReturnType. */
export function safeParseManifest(raw: unknown) {
  return pluginManifestSchema.safeParse(raw);
}
